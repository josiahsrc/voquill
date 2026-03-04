use crate::platform::keyboard::{run_listen_loop, setup_listener_process};
use rdev::Event;

fn scan_code(event: &Event) -> u32 {
    event.position_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;
    if super::wayland::is_wayland() {
        eprintln!("Wayland session detected, using evdev keyboard listener");
        return super::evdev_listener::run_evdev_listen_loop(ctx.writer);
    }
    run_listen_loop(ctx.writer, scan_code)
}
