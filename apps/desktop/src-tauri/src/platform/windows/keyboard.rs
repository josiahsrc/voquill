use crate::platform::keyboard::{
    key_raw_code, key_to_label, run_listen_loop, send_event_to_tcp, setup_listener_process,
    update_grab_hotkey_state, GrabDecision, GrabHotkeyState, KeyboardEventPayload, WireEventKind,
};
use rdev::{Event, EventType};
use std::cell::RefCell;

fn scan_code(event: &Event) -> u32 {
    event.position_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;

    let grab_result = rdev::grab({
        let writer = ctx.writer.clone();
        let combos = ctx.combos.clone();
        let state = RefCell::new(GrabHotkeyState::default());
        move |event| -> Option<Event> {
            let (key, is_press) = match event.event_type {
                EventType::KeyPress(key) => (key, true),
                EventType::KeyRelease(key) => (key, false),
                _ => return Some(event),
            };

            let label = key_to_label(key);
            let payload = KeyboardEventPayload {
                kind: if is_press {
                    WireEventKind::Press
                } else {
                    WireEventKind::Release
                },
                key_label: label.clone(),
                raw_code: key_raw_code(key),
                scan_code: event.position_code,
            };
            send_event_to_tcp(&writer, &payload);

            let mut s = state.borrow_mut();
            let current_combos = combos.lock().map(|g| g.clone()).unwrap_or_default();

            if update_grab_hotkey_state(&mut s, &label, is_press, &current_combos)
                == GrabDecision::Suppress
            {
                None
            } else {
                Some(event)
            }
        }
    });

    match grab_result {
        Ok(()) => return Ok(()),
        Err(grab_err) => {
            eprintln!("rdev::grab() failed ({grab_err:?}), falling back to rdev::listen()");
        }
    }

    run_listen_loop(ctx.writer, scan_code)
}
