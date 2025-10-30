#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{
    check_accessibility_permission, check_microphone_permission, request_accessibility_permission,
    request_microphone_permission,
};

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::{
    check_accessibility_permission, check_microphone_permission, request_accessibility_permission,
    request_microphone_permission,
};

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::{
    check_accessibility_permission, check_microphone_permission, request_accessibility_permission,
    request_microphone_permission,
};

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
mod fallback;
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
pub use fallback::{
    check_accessibility_permission, check_microphone_permission, request_accessibility_permission,
    request_microphone_permission,
};
