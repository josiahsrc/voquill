use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use tempfile::TempDir;
use tokio::time::sleep;

const HEALTH_TIMEOUT: Duration = Duration::from_secs(20);
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(900);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: String,
    mode: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelStatusResponse {
    downloaded: bool,
    valid: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiErrorEnvelope {
    error: ApiErrorDetails,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiErrorDetails {
    code: String,
    message: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
enum DownloadJobStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DownloadJobSnapshot {
    job_id: String,
    status: DownloadJobStatus,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscribeRequest {
    model: String,
    samples: Vec<f32>,
    sample_rate: u32,
    language: Option<String>,
    initial_prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscribeResponse {
    text: String,
    inference_device: String,
}

struct RunningSidecar {
    child: Child,
    client: Client,
    base_url: String,
    _models_dir: TempDir,
}

impl RunningSidecar {
    async fn start_cpu() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let port = reserve_local_port()?;
        let models_dir = tempfile::tempdir()?;
        let base_url = format!("http://127.0.0.1:{port}");

        let child = Command::new(env!("CARGO_BIN_EXE_rust-transcription-cpu"))
            .env("RUST_TRANSCRIPTION_HOST", "127.0.0.1")
            .env("RUST_TRANSCRIPTION_PORT", port.to_string())
            .env("RUST_TRANSCRIPTION_MODELS_DIR", models_dir.path())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()?;

        let client = Client::builder().timeout(Duration::from_secs(10)).build()?;

        let mut sidecar = Self {
            child,
            client,
            base_url,
            _models_dir: models_dir,
        };

        sidecar.wait_until_healthy().await?;
        Ok(sidecar)
    }

    async fn wait_until_healthy(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let deadline = Instant::now() + HEALTH_TIMEOUT;

        loop {
            if let Some(status) = self.child.try_wait()? {
                return Err(format!("sidecar exited early with status {status}").into());
            }

            let health_url = format!("{}/health", self.base_url);
            if let Ok(response) = self.client.get(&health_url).send().await {
                if response.status() == StatusCode::OK {
                    return Ok(());
                }
            }

            if Instant::now() > deadline {
                return Err("timed out waiting for sidecar health endpoint".into());
            }

            sleep(Duration::from_millis(150)).await;
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }
}

impl Drop for RunningSidecar {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[tokio::test]
async fn cpu_sidecar_health_and_missing_model_error_flow(
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let sidecar = RunningSidecar::start_cpu().await?;

    let health = sidecar
        .client
        .get(sidecar.url("/health"))
        .send()
        .await?
        .error_for_status()?
        .json::<HealthResponse>()
        .await?;

    assert_eq!(health.status, "ok");
    assert_eq!(health.mode, "cpu");

    let model_status = sidecar
        .client
        .get(sidecar.url("/v1/models/tiny/status"))
        .send()
        .await?
        .error_for_status()?
        .json::<ModelStatusResponse>()
        .await?;

    assert!(!model_status.downloaded);
    assert!(!model_status.valid);

    let response = sidecar
        .client
        .post(sidecar.url("/v1/transcriptions"))
        .json(&TranscribeRequest {
            model: "tiny".to_string(),
            samples: vec![0.1_f32, -0.1_f32, 0.0_f32],
            sample_rate: 16_000,
            language: Some("en".to_string()),
            initial_prompt: None,
        })
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = response.json::<ApiErrorEnvelope>().await?;
    assert_eq!(body.error.code, "model_not_downloaded");
    assert!(body.error.message.contains("download"));

    Ok(())
}

#[tokio::test]
#[ignore = "downloads tiny model and runs real transcription against sidecar"]
async fn cpu_sidecar_end_to_end_download_and_transcribe(
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let sidecar = RunningSidecar::start_cpu().await?;

    let download = sidecar
        .client
        .post(sidecar.url("/v1/models/tiny/download"))
        .send()
        .await?
        .error_for_status()?
        .json::<DownloadJobSnapshot>()
        .await?;

    let deadline = Instant::now() + DOWNLOAD_TIMEOUT;
    let mut final_status = download.status.clone();

    while Instant::now() < deadline {
        let progress = sidecar
            .client
            .get(sidecar.url(&format!("/v1/models/tiny/download/{}", download.job_id)))
            .send()
            .await?
            .error_for_status()?
            .json::<DownloadJobSnapshot>()
            .await?;

        final_status = progress.status;

        match final_status {
            DownloadJobStatus::Completed => break,
            DownloadJobStatus::Failed => {
                return Err(format!(
                    "model download failed: {}",
                    progress
                        .error
                        .unwrap_or_else(|| "unknown error".to_string())
                )
                .into())
            }
            DownloadJobStatus::Pending | DownloadJobStatus::Running => {
                sleep(Duration::from_millis(500)).await;
            }
        }
    }

    if !matches!(final_status, DownloadJobStatus::Completed) {
        return Err("timed out waiting for model download to complete".into());
    }

    let model_status = sidecar
        .client
        .get(sidecar.url("/v1/models/tiny/status?validate=true"))
        .send()
        .await?
        .error_for_status()?
        .json::<ModelStatusResponse>()
        .await?;

    assert!(model_status.downloaded);
    assert!(model_status.valid);

    let (samples, sample_rate) = load_wav_as_f32_mono(&audio_asset_path("test.wav")?, 10)?;
    assert!(!samples.is_empty());

    let transcription = sidecar
        .client
        .post(sidecar.url("/v1/transcriptions"))
        .json(&TranscribeRequest {
            model: "tiny".to_string(),
            samples,
            sample_rate,
            language: Some("en".to_string()),
            initial_prompt: Some("Transcribe clearly.".to_string()),
        })
        .send()
        .await?
        .error_for_status()?
        .json::<TranscribeResponse>()
        .await?;

    assert!(!transcription.text.trim().is_empty());
    assert_eq!(transcription.inference_device, "CPU");

    Ok(())
}

fn reserve_local_port() -> Result<u16, std::io::Error> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

fn audio_asset_path(file_name: &str) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("assets")
        .join(file_name);

    if !path.exists() {
        return Err(format!("audio fixture not found at {}", path.display()).into());
    }

    Ok(path)
}

fn load_wav_as_f32_mono(
    path: &Path,
    max_seconds: u32,
) -> Result<(Vec<f32>, u32), Box<dyn std::error::Error + Send + Sync>> {
    let mut reader = hound::WavReader::open(path)?;
    let spec = reader.spec();
    let channels = usize::from(spec.channels.max(1));
    let sample_rate = spec.sample_rate;
    let max_frames = (sample_rate as usize).saturating_mul(max_seconds as usize);

    let interleaved: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader
            .samples::<f32>()
            .take(max_frames * channels)
            .collect::<Result<Vec<_>, _>>()?,
        hound::SampleFormat::Int => {
            if spec.bits_per_sample <= 16 {
                let denom = i16::MAX as f32;
                reader
                    .samples::<i16>()
                    .take(max_frames * channels)
                    .map(|sample| sample.map(|value| (value as f32 / denom).clamp(-1.0, 1.0)))
                    .collect::<Result<Vec<_>, _>>()?
            } else {
                let max_value = ((1_i64 << (spec.bits_per_sample.saturating_sub(1))) - 1) as f32;
                reader
                    .samples::<i32>()
                    .take(max_frames * channels)
                    .map(|sample| sample.map(|value| (value as f32 / max_value).clamp(-1.0, 1.0)))
                    .collect::<Result<Vec<_>, _>>()?
            }
        }
    };

    let mono = if channels == 1 {
        interleaved
    } else {
        let mut output = Vec::with_capacity(interleaved.len() / channels);
        for frame in interleaved.chunks(channels) {
            let sum: f32 = frame.iter().copied().sum();
            output.push(sum / channels as f32);
        }
        output
    };

    Ok((mono, sample_rate))
}
