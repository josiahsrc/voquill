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
pub mod audio_processing;
pub mod whisper;

#[cfg(desktop)]
pub mod keyboard;

pub type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;

#[derive(Clone, Debug, Default)]
pub struct TranscriptionRequest {
    pub device: Option<TranscriptionDevice>,
    pub model_path: Option<String>,
    pub initial_prompt: Option<String>,
    pub language: Option<String>,
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
    ) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&self) -> Result<crate::domain::RecordingResult, Box<dyn std::error::Error>>;
    fn set_preferred_input_device(&self, _name: Option<String>) {}
}

pub trait Transcriber: Send + Sync {
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String>;
}
