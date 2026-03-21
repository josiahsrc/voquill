use crate::platform::keyboard::{run_listen_loop, setup_listener_process};
use rdev::Event;

fn scan_code(event: &Event) -> u32 {
    event.position_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;
    run_listen_loop(ctx.writer, scan_code)
}
