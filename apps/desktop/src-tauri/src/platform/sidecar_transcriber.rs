use crate::platform::{Transcriber, TranscriptionRequest};
use crate::sidecar::{TranscribeRequest, TranscribeResponse, SIDECAR_ENV_MODEL_PATH, SIDECAR_ENV_PORT};
use std::io::{BufRead, BufReader, BufWriter, ErrorKind, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const SIDECAR_STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
const SIDECAR_REQUEST_TIMEOUT: Duration = Duration::from_secs(120);

pub struct SidecarTranscriber {
    model_path: PathBuf,
    sidecar_path: PathBuf,
    temp_dir: PathBuf,
    state: Mutex<SidecarState>,
    gpu_available: AtomicBool,
    fallback_transcriber: Arc<crate::platform::whisper::WhisperTranscriber>,
}

struct SidecarState {
    child: Option<Child>,
    stream: Option<TcpStream>,
    port: u16,
}

impl SidecarTranscriber {
    pub fn new(
        app_handle: &tauri::AppHandle,
        model_path: &Path,
    ) -> Result<Self, String> {
        let sidecar_path = resolve_sidecar_path()?;
        eprintln!("[sidecar-transcriber] Sidecar path: {}", sidecar_path.display());

        let temp_dir = std::env::temp_dir();

        // Create fallback CPU transcriber
        let fallback_transcriber = Arc::new(
            crate::platform::whisper::WhisperTranscriber::new(model_path)?
        );

        Ok(Self {
            model_path: model_path.to_path_buf(),
            sidecar_path,
            temp_dir,
            state: Mutex::new(SidecarState {
                child: None,
                stream: None,
                port: 0,
            }),
            gpu_available: AtomicBool::new(true),
            fallback_transcriber,
        })
    }

    fn ensure_sidecar_running(&self) -> Result<(), String> {
        let mut state = self.state.lock().unwrap();

        // Check if existing sidecar is still alive
        if let Some(ref mut child) = state.child {
            match child.try_wait() {
                Ok(Some(status)) => {
                    eprintln!("[sidecar-transcriber] Sidecar exited with status: {status}");
                    state.child = None;
                    state.stream = None;
                }
                Ok(None) => {
                    // Still running, check if we have a valid stream
                    if state.stream.is_some() {
                        return Ok(());
                    }
                }
                Err(err) => {
                    eprintln!("[sidecar-transcriber] Failed to check sidecar status: {err}");
                    state.child = None;
                    state.stream = None;
                }
            }
        }

        // Start a new sidecar
        eprintln!("[sidecar-transcriber] Starting GPU sidecar...");

        // Bind to dynamic port
        let listener = TcpListener::bind(("127.0.0.1", 0))
            .map_err(|err| format!("Failed to bind sidecar listener: {err}"))?;
        listener
            .set_nonblocking(true)
            .map_err(|err| format!("Failed to configure listener: {err}"))?;
        let port = listener
            .local_addr()
            .map_err(|err| format!("Failed to get listener address: {err}"))?
            .port();

        eprintln!("[sidecar-transcriber] Listening on port {port} for sidecar connection");

        // Spawn sidecar process
        let mut command = Command::new(&self.sidecar_path);
        command
            .env(SIDECAR_ENV_PORT, port.to_string())
            .env(SIDECAR_ENV_MODEL_PATH, self.model_path.to_string_lossy().as_ref())
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::inherit());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let child = command
            .spawn()
            .map_err(|err| format!("Failed to spawn GPU sidecar: {err}"))?;

        eprintln!("[sidecar-transcriber] Sidecar process spawned, waiting for connection...");

        // Wait for sidecar to connect with timeout
        let start = std::time::Instant::now();
        let stream = loop {
            if start.elapsed() > SIDECAR_STARTUP_TIMEOUT {
                return Err("Sidecar connection timeout".to_string());
            }

            match listener.accept() {
                Ok((stream, addr)) => {
                    eprintln!("[sidecar-transcriber] Sidecar connected from {addr}");
                    stream
                        .set_nodelay(true)
                        .map_err(|e| format!("Failed to configure stream: {e}"))?;
                    stream
                        .set_read_timeout(Some(SIDECAR_REQUEST_TIMEOUT))
                        .map_err(|e| format!("Failed to set read timeout: {e}"))?;
                    stream
                        .set_write_timeout(Some(Duration::from_secs(10)))
                        .map_err(|e| format!("Failed to set write timeout: {e}"))?;
                    break stream;
                }
                Err(ref err) if err.kind() == ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(50));
                }
                Err(err) => {
                    return Err(format!("Failed to accept sidecar connection: {err}"));
                }
            }
        };

        state.child = Some(child);
        state.stream = Some(stream);
        state.port = port;

        eprintln!("[sidecar-transcriber] Sidecar is ready");
        Ok(())
    }

    fn transcribe_via_sidecar(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String> {
        // Write samples to temp WAV file
        let request_id = uuid_v4();
        let audio_path = self.temp_dir.join(format!("voquill-sidecar-{request_id}.wav"));

        write_wav_file(&audio_path, samples, sample_rate)?;

        // Ensure cleanup on exit
        let _cleanup = TempFileGuard { path: audio_path.clone() };

        // Ensure sidecar is running
        self.ensure_sidecar_running()?;

        // Send request
        let transcribe_req = TranscribeRequest {
            id: request_id.clone(),
            audio_path: audio_path.to_string_lossy().to_string(),
            language: request.and_then(|r| r.language.clone()),
            initial_prompt: request.and_then(|r| r.initial_prompt.clone()),
        };

        let response = self.send_request(&transcribe_req)?;

        if let Some(error) = response.error {
            return Err(error);
        }

        response.result.ok_or_else(|| "No transcription result".to_string())
    }

    fn send_request(&self, request: &TranscribeRequest) -> Result<TranscribeResponse, String> {
        let mut state = self.state.lock().unwrap();
        let stream = state
            .stream
            .as_mut()
            .ok_or_else(|| "Sidecar stream not available".to_string())?;

        // Send request
        let json = serde_json::to_string(request)
            .map_err(|err| format!("Failed to serialize request: {err}"))?;

        let mut writer = BufWriter::new(stream.try_clone().map_err(|e| e.to_string())?);
        writeln!(writer, "{json}").map_err(|err| format!("Failed to write request: {err}"))?;
        writer.flush().map_err(|err| format!("Failed to flush request: {err}"))?;

        // Read response
        let reader = BufReader::new(stream.try_clone().map_err(|e| e.to_string())?);
        for line in reader.lines() {
            let line = line.map_err(|err| format!("Failed to read response: {err}"))?;
            if line.trim().is_empty() {
                continue;
            }

            let response: TranscribeResponse = serde_json::from_str(&line)
                .map_err(|err| format!("Failed to parse response: {err}"))?;

            if response.id == request.id {
                return Ok(response);
            }
        }

        Err("Connection closed before receiving response".to_string())
    }

    fn mark_gpu_unavailable(&self) {
        self.gpu_available.store(false, Ordering::SeqCst);
    }

    fn is_gpu_available(&self) -> bool {
        self.gpu_available.load(Ordering::SeqCst)
    }
}

impl Transcriber for SidecarTranscriber {
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String> {
        // Skip sidecar if we've determined GPU is not available
        if !self.is_gpu_available() {
            eprintln!("[sidecar-transcriber] GPU unavailable, using CPU fallback");
            return self.fallback_transcriber.transcribe(samples, sample_rate, request);
        }

        // Check if GPU is disabled via environment
        if std::env::var("VOQUILL_WHISPER_DISABLE_GPU")
            .map(|v| v.trim() == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
        {
            eprintln!("[sidecar-transcriber] GPU disabled via environment, using CPU");
            return self.fallback_transcriber.transcribe(samples, sample_rate, request);
        }

        // Try GPU sidecar
        match self.transcribe_via_sidecar(samples, sample_rate, request) {
            Ok(result) => Ok(result),
            Err(err) => {
                eprintln!("[sidecar-transcriber] GPU transcription failed: {err}");
                eprintln!("[sidecar-transcriber] Falling back to CPU transcription");

                // Mark GPU as unavailable for future requests
                self.mark_gpu_unavailable();

                // Kill any existing sidecar
                if let Ok(mut state) = self.state.lock() {
                    if let Some(mut child) = state.child.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                    state.stream = None;
                }

                // Fall back to CPU
                self.fallback_transcriber.transcribe(samples, sample_rate, request)
            }
        }
    }
}

impl Drop for SidecarTranscriber {
    fn drop(&mut self) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(mut child) = state.child.take() {
                eprintln!("[sidecar-transcriber] Shutting down GPU sidecar...");
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

fn resolve_sidecar_path() -> Result<PathBuf, String> {
    // Get current executable path
    let exe_path = std::env::current_exe()
        .map_err(|err| format!("Failed to get current executable: {err}"))?;

    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;

    // Sidecar name with platform suffix
    let sidecar_name = get_sidecar_filename();

    // Try several locations
    let candidates = [
        // Same directory as main executable (production)
        exe_dir.join(&sidecar_name),
        // Tauri sidecar directory structure
        exe_dir.join("sidecars").join(&sidecar_name),
        // Development: target directory
        exe_dir.join("..").join(&sidecar_name),
    ];

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.canonicalize().unwrap_or_else(|_| candidate.clone()));
        }
    }

    Err(format!(
        "GPU sidecar not found. Searched: {:?}",
        candidates.iter().map(|p| p.display().to_string()).collect::<Vec<_>>()
    ))
}

fn get_sidecar_filename() -> String {
    #[cfg(target_os = "windows")]
    {
        #[cfg(target_arch = "x86_64")]
        return "voquill-gpu-sidecar-x86_64-pc-windows-msvc.exe".to_string();
        #[cfg(target_arch = "aarch64")]
        return "voquill-gpu-sidecar-aarch64-pc-windows-msvc.exe".to_string();
    }

    #[cfg(target_os = "linux")]
    {
        #[cfg(target_arch = "x86_64")]
        return "voquill-gpu-sidecar-x86_64-unknown-linux-gnu".to_string();
        #[cfg(target_arch = "aarch64")]
        return "voquill-gpu-sidecar-aarch64-unknown-linux-gnu".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        // macOS doesn't use the sidecar, but include for completeness
        #[cfg(target_arch = "x86_64")]
        return "voquill-gpu-sidecar-x86_64-apple-darwin".to_string();
        #[cfg(target_arch = "aarch64")]
        return "voquill-gpu-sidecar-aarch64-apple-darwin".to_string();
    }

    #[allow(unreachable_code)]
    "voquill-gpu-sidecar".to_string()
}

fn uuid_v4() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        (bytes[6] & 0x0f) | 0x40, bytes[7],
        (bytes[8] & 0x3f) | 0x80, bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

fn write_wav_file(path: &Path, samples: &[f32], sample_rate: u32) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = hound::WavWriter::create(path, spec)
        .map_err(|err| format!("Failed to create WAV file: {err}"))?;

    for sample in samples {
        writer
            .write_sample(*sample)
            .map_err(|err| format!("Failed to write sample: {err}"))?;
    }

    writer
        .finalize()
        .map_err(|err| format!("Failed to finalize WAV: {err}"))?;

    Ok(())
}

struct TempFileGuard {
    path: PathBuf,
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if self.path.exists() {
            let _ = std::fs::remove_file(&self.path);
        }
    }
}
