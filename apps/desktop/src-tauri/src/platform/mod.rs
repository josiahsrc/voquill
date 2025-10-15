#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "macos")]
pub mod macos;

pub mod audio;
pub mod whisper;

pub trait Recorder: Send + Sync {
    fn start(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&self) -> Result<crate::domain::RecordingResult, Box<dyn std::error::Error>>;
}

pub trait Transcriber: Send + Sync {
    fn transcribe(&self, samples: &[f32], sample_rate: u32) -> Result<String, String>;
}
