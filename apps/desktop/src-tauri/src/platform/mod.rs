use std::sync::Arc;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "linux")]
pub use linux::accessibility;
#[cfg(target_os = "linux")]
pub use linux::input;
#[cfg(target_os = "linux")]
pub use linux::monitor;
#[cfg(target_os = "linux")]
pub use linux::permissions;
#[cfg(target_os = "linux")]
pub use linux::position;
#[cfg(target_os = "linux")]
pub use linux::window;

#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "macos")]
pub use macos::accessibility;
#[cfg(target_os = "macos")]
pub use macos::input;
#[cfg(target_os = "macos")]
pub use macos::monitor;
#[cfg(target_os = "macos")]
pub use macos::permissions;
#[cfg(target_os = "macos")]
pub use macos::position;
#[cfg(target_os = "macos")]
pub use macos::window;

#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows::accessibility;
#[cfg(target_os = "windows")]
pub use windows::input;
#[cfg(target_os = "windows")]
pub use windows::monitor;
#[cfg(target_os = "windows")]
pub use windows::permissions;
#[cfg(target_os = "windows")]
pub use windows::position;
#[cfg(target_os = "windows")]
pub use windows::window;

#[cfg(target_os = "linux")]
pub use linux::keyboard_language;
#[cfg(target_os = "macos")]
pub use macos::keyboard_language;
#[cfg(target_os = "windows")]
pub use windows::keyboard_language;

pub mod app_info;

pub mod audio;

#[cfg(desktop)]
pub mod keyboard;

pub type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;
pub type ChunkCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync>;

pub trait Recorder: Send + Sync {
    fn start(
        &self,
        level_callback: Option<LevelCallback>,
        chunk_callback: Option<ChunkCallback>,
    ) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&self) -> Result<crate::domain::RecordingResult, Box<dyn std::error::Error>>;
    fn set_preferred_input_device(&self, _name: Option<String>) {}
    fn clear_device_cache(&self) {}
    fn current_sample_rate(&self) -> Option<u32> {
        None
    }
}
