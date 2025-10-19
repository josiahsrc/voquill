use std::sync::Arc;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;

pub mod audio;
pub mod permissions;
pub mod whisper;

#[cfg(desktop)]
pub(crate) mod key_state;
#[cfg(desktop)]
pub(crate) mod keyboard;

pub type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;

pub trait Recorder: Send + Sync {
    fn start(
        &self,
        level_callback: Option<LevelCallback>,
    ) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&self) -> Result<crate::domain::RecordingResult, Box<dyn std::error::Error>>;
    fn set_preferred_input_device(&self, _name: Option<String>) {}
}

pub trait Transcriber: Send + Sync {
    fn transcribe(&self, samples: &[f32], sample_rate: u32) -> Result<String, String>;
}
