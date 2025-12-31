use std::sync::Arc;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "linux")]
pub use linux::input;
#[cfg(target_os = "linux")]
pub use linux::permissions;
#[cfg(target_os = "linux")]
pub use linux::window;

#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "macos")]
pub use macos::input;
#[cfg(target_os = "macos")]
pub use macos::permissions;
#[cfg(target_os = "macos")]
pub use macos::window;

#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows::input;
#[cfg(target_os = "windows")]
pub use windows::permissions;
#[cfg(target_os = "windows")]
pub use windows::window;

pub mod app_info;

pub mod audio;
pub mod whisper;

#[cfg(feature = "cuda")]
pub mod parakeet;

#[cfg(desktop)]
pub mod keyboard;

pub type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;
pub type ChunkCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;

#[derive(Clone, Debug, Default)]
pub struct TranscriptionRequest {
    pub device: Option<TranscriptionDevice>,
    pub model_path: Option<String>,
    pub initial_prompt: Option<String>,
    pub language: Option<String>,
    pub model_family: Option<crate::system::models::ModelFamily>,
}

#[derive(Clone, Debug)]
pub enum TranscriptionDevice {
    Cpu,
    Gpu(GpuDescriptor),
}

#[derive(Clone, Debug, Default)]
pub struct GpuDescriptor {
    pub id: Option<u32>,
    pub name: Option<String>,
}

pub trait Recorder: Send + Sync {
    fn start(
        &self,
        level_callback: Option<LevelCallback>,
        chunk_callback: Option<ChunkCallback>,
    ) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&self) -> Result<crate::domain::RecordingResult, Box<dyn std::error::Error>>;
    fn set_preferred_input_device(&self, _name: Option<String>) {}
    fn current_sample_rate(&self) -> Option<u32> {
        None
    }
}

pub trait Transcriber: Send + Sync {
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String>;
}

pub enum TranscriberBackend {
    WhisperOnly(Arc<whisper::WhisperTranscriber>),
    #[cfg(feature = "cuda")]
    DualMode {
        whisper: Arc<whisper::WhisperTranscriber>,
        parakeet: Arc<parakeet::ParakeetTranscriber>,
    },
}

impl Transcriber for TranscriberBackend {
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String> {
        // Check if model family is specified in the request
        let model_family = request
            .and_then(|r| r.model_family.as_ref())
            .copied()
            .unwrap_or(crate::system::models::ModelFamily::Whisper);

        match model_family {
            crate::system::models::ModelFamily::Whisper => match self {
                Self::WhisperOnly(t) => t.transcribe(samples, sample_rate, request),
                #[cfg(feature = "cuda")]
                Self::DualMode { whisper, .. } => whisper.transcribe(samples, sample_rate, request),
            },
            #[cfg(feature = "cuda")]
            crate::system::models::ModelFamily::Parakeet => match self {
                Self::DualMode { parakeet, .. } => parakeet.transcribe(samples, sample_rate, request),
                Self::WhisperOnly(_) => Err(
                    "Parakeet model requested but CUDA support not available in this build. Please select a Whisper model."
                        .to_string(),
                ),
            },
            #[cfg(not(feature = "cuda"))]
            crate::system::models::ModelFamily::Parakeet => Err(
                "Parakeet models are not supported in this build. Please select a Whisper model."
                    .to_string(),
            ),
        }
    }
}
