pub fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}
