mod detect;
mod wl;
mod x11;

pub mod accessibility;
pub mod audio;
pub mod compositor;
pub mod feedback;
pub mod init;
pub mod input;
pub mod keyboard;
pub mod keyboard_language;
pub mod monitor;
pub mod overlay;
pub mod permissions;
pub mod position;
pub mod window;

pub fn get_hotkey_strategy() -> &'static str {
    if detect::is_wayland() {
        "bridge"
    } else {
        "listener"
    }
}
