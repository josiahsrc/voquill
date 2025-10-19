#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{ensure_input_monitor_permission, ensure_microphone_permission};

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::{ensure_input_monitor_permission, ensure_microphone_permission};

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::{ensure_input_monitor_permission, ensure_microphone_permission};

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
mod fallback;
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
pub use fallback::{ensure_input_monitor_permission, ensure_microphone_permission};
