#[cfg(unix)]
mod unix;
#[cfg(unix)]
pub use unix::{RawModeGuard, build_command, terminal_size};

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{RawModeGuard, build_command, terminal_size};
