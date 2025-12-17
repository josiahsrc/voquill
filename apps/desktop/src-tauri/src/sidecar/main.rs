// GPU Sidecar binary for Voquill
// This binary is compiled with Vulkan support and handles GPU-accelerated transcription.
// It runs as a child process of the main application, communicating via TCP.

use serde::{Deserialize, Serialize};
use std::env;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::Arc;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

const SIDECAR_ENV_PORT: &str = "VOQUILL_GPU_SIDECAR_PORT";
const SIDECAR_ENV_MODEL_PATH: &str = "VOQUILL_GPU_SIDECAR_MODEL_PATH";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TranscribeRequest {
    id: String,
    audio_path: String,
    language: Option<String>,
    initial_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TranscribeResponse {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

impl TranscribeResponse {
    fn success(id: String, result: String) -> Self {
        Self {
            id,
            result: Some(result),
            error: None,
        }
    }

    fn error(id: String, error: String) -> Self {
        Self {
            id,
            result: None,
            error: Some(error),
        }
    }
}

fn main() {
    eprintln!("[gpu-sidecar] Starting GPU transcription sidecar...");

    if let Err(err) = run_sidecar() {
        eprintln!("[gpu-sidecar] Fatal error: {err}");
        std::process::exit(1);
    }
}

fn run_sidecar() -> Result<(), String> {
    let port = env::var(SIDECAR_ENV_PORT)
        .map_err(|_| format!("{SIDECAR_ENV_PORT} environment variable not set"))?
        .parse::<u16>()
        .map_err(|err| format!("Invalid port number: {err}"))?;

    let model_path = env::var(SIDECAR_ENV_MODEL_PATH)
        .map_err(|_| format!("{SIDECAR_ENV_MODEL_PATH} environment variable not set"))?;

    eprintln!("[gpu-sidecar] Port: {port}");
    eprintln!("[gpu-sidecar] Model path: {model_path}");

    // Initialize Whisper context with GPU support
    eprintln!("[gpu-sidecar] Initializing Whisper with GPU...");
    let context = initialize_whisper_gpu(&model_path)?;
    eprintln!("[gpu-sidecar] Whisper initialized successfully");

    // Connect to the main process
    let stream = TcpStream::connect(("127.0.0.1", port))
        .map_err(|err| format!("Failed to connect to main process: {err}"))?;
    stream
        .set_nodelay(true)
        .map_err(|err| format!("Failed to configure socket: {err}"))?;

    eprintln!("[gpu-sidecar] Connected to main process on port {port}");

    // Handle transcription requests
    handle_requests(stream, context)
}

fn initialize_whisper_gpu(model_path: &str) -> Result<Arc<WhisperContext>, String> {
    use whisper_rs::vulkan;
    use std::panic;

    eprintln!("[gpu-sidecar] Attempting to enumerate Vulkan devices...");

    let devices = match panic::catch_unwind(|| vulkan::list_devices()) {
        Ok(devs) => {
            eprintln!(
                "[gpu-sidecar] Found {} Vulkan device(s)",
                devs.len()
            );
            devs
        }
        Err(panic_info) => {
            eprintln!("[gpu-sidecar] ERROR: Vulkan device enumeration panicked!");
            if let Some(s) = panic_info.downcast_ref::<&str>() {
                eprintln!("[gpu-sidecar] Panic message: {s}");
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                eprintln!("[gpu-sidecar] Panic message: {s}");
            }
            return Err("Vulkan device enumeration failed (panic)".to_string());
        }
    };

    if devices.is_empty() {
        return Err("No Vulkan-capable GPU detected".to_string());
    }

    // Select GPU with most free VRAM
    let selected = devices
        .into_iter()
        .max_by(|left, right| left.vram.free.cmp(&right.vram.free))
        .unwrap();

    let free_gib = selected.vram.free as f64 / (1024.0 * 1024.0 * 1024.0);
    eprintln!(
        "[gpu-sidecar] Selected GPU: '{}' (ID: {}, ~{free_gib:.2} GiB free VRAM)",
        selected.name, selected.id
    );

    let mut params = WhisperContextParameters::default();
    params.use_gpu(true);
    params.gpu_device(selected.id);

    WhisperContext::new_with_params(model_path, params)
        .map(Arc::new)
        .map_err(|err| format!("Failed to initialize Whisper with GPU: {err}"))
}

fn handle_requests(stream: TcpStream, context: Arc<WhisperContext>) -> Result<(), String> {
    let reader = BufReader::new(stream.try_clone().map_err(|e| e.to_string())?);
    let mut writer = BufWriter::new(stream);

    for line in reader.lines() {
        let line = line.map_err(|err| format!("Failed to read request: {err}"))?;
        if line.trim().is_empty() {
            continue;
        }

        let response = match serde_json::from_str::<TranscribeRequest>(&line) {
            Ok(request) => {
                eprintln!("[gpu-sidecar] Processing request: {}", request.id);
                process_transcription(&context, request)
            }
            Err(err) => {
                eprintln!("[gpu-sidecar] Malformed request: {err}");
                TranscribeResponse::error("unknown".to_string(), format!("Malformed request: {err}"))
            }
        };

        let json = serde_json::to_string(&response)
            .map_err(|err| format!("Failed to serialize response: {err}"))?;
        writeln!(writer, "{json}").map_err(|err| format!("Failed to write response: {err}"))?;
        writer.flush().map_err(|err| format!("Failed to flush response: {err}"))?;
    }

    eprintln!("[gpu-sidecar] Connection closed");
    Ok(())
}

fn process_transcription(
    context: &WhisperContext,
    request: TranscribeRequest,
) -> TranscribeResponse {
    match do_transcription(context, &request) {
        Ok(transcript) => {
            eprintln!("[gpu-sidecar] Transcription complete for {}", request.id);
            TranscribeResponse::success(request.id, transcript)
        }
        Err(err) => {
            eprintln!("[gpu-sidecar] Transcription failed for {}: {err}", request.id);
            TranscribeResponse::error(request.id, err)
        }
    }
}

fn do_transcription(context: &WhisperContext, request: &TranscribeRequest) -> Result<String, String> {
    // Read audio file
    let audio_path = PathBuf::from(&request.audio_path);
    let reader = hound::WavReader::open(&audio_path)
        .map_err(|err| format!("Failed to open audio file: {err}"))?;

    let spec = reader.spec();
    let sample_rate = spec.sample_rate;

    // Read samples based on format
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => {
            reader
                .into_samples::<f32>()
                .filter_map(Result::ok)
                .collect()
        }
        hound::SampleFormat::Int => {
            let bits = spec.bits_per_sample;
            let max_value = (1i32 << (bits - 1)) as f32;
            reader
                .into_samples::<i32>()
                .filter_map(Result::ok)
                .map(|s| s as f32 / max_value)
                .collect()
        }
    };

    if samples.is_empty() {
        return Err("Audio file contains no samples".to_string());
    }

    // Resample to 16kHz if needed
    const TARGET_SAMPLE_RATE: u32 = 16_000;
    let processed = if sample_rate == TARGET_SAMPLE_RATE {
        samples
    } else {
        resample(&samples, sample_rate, TARGET_SAMPLE_RATE)
    };

    // Create Whisper state and run inference
    let mut state = context
        .create_state()
        .map_err(|err| format!("Failed to create Whisper state: {err}"))?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    // Set language
    if let Some(lang) = request.language.as_deref().filter(|s| !s.is_empty()) {
        params.set_language(Some(lang));
    } else {
        params.set_language(Some("en"));
    }

    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_no_context(true);

    // Set initial prompt
    if let Some(prompt) = request.initial_prompt.as_ref() {
        let sanitized: String = prompt.chars().filter(|ch| *ch != '\0').collect();
        let trimmed = sanitized.trim();
        if !trimmed.is_empty() {
            params.set_initial_prompt(trimmed);
        }
    }

    state
        .full(params, &processed)
        .map_err(|err| format!("Whisper inference failed: {err}"))?;

    // Collect transcript
    let mut transcript = String::new();
    for segment in state.as_iter() {
        match segment.to_str() {
            Ok(text) => {
                if !transcript.is_empty() {
                    transcript.push(' ');
                }
                transcript.push_str(text.trim());
            }
            Err(WhisperError::InvalidUtf8 { .. }) => {
                if let Ok(text) = segment.to_str_lossy() {
                    if !transcript.is_empty() {
                        transcript.push(' ');
                    }
                    transcript.push_str(text.trim());
                }
            }
            Err(err) => {
                return Err(format!("Failed to read segment: {err}"));
            }
        }
    }

    Ok(transcript.trim().to_string())
}

fn resample(samples: &[f32], input_rate: u32, target_rate: u32) -> Vec<f32> {
    if samples.is_empty() || input_rate == 0 || target_rate == 0 {
        return Vec::new();
    }

    if input_rate == target_rate {
        return samples.to_vec();
    }

    let ratio = f64::from(target_rate) / f64::from(input_rate);
    let output_len = ((samples.len() as f64) * ratio).ceil().max(1.0) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = (i as f64) / ratio;
        let base_index = src_pos.floor() as usize;
        let frac = src_pos - base_index as f64;

        let sample = if base_index + 1 < samples.len() {
            let a = samples[base_index];
            let b = samples[base_index + 1];
            a + (b - a) * frac as f32
        } else {
            samples[base_index]
        };

        output.push(sample);
    }

    output
}
