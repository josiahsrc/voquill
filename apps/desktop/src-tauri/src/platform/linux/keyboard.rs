pub fn run_listener_process() -> Result<(), String> {
    if super::detect::is_wayland() {
        return Ok(());
    }
    super::x11::keyboard::run_listener_process()
}
