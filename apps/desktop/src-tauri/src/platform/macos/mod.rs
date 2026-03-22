pub mod accessibility;
pub mod init;
pub mod compositor;
pub mod dock;
pub mod input;
pub mod keyboard;
pub mod keyboard_language;
pub mod monitor;
pub mod overlay;
pub mod permissions;
pub mod position;
pub mod window;

pub fn get_hotkey_strategy() -> &'static str {
    "listener"
}
