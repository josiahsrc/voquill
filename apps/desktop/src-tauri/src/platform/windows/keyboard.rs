use crate::platform::keyboard::{
    key_raw_code, key_to_label, matches_any_combo, run_listen_loop, send_event_to_tcp,
    setup_listener_process, KeyboardEventPayload, WireEventKind,
};
use rdev::{Event, EventType};
use std::cell::RefCell;
use std::collections::HashSet;

fn scan_code(event: &Event) -> u32 {
    event.position_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;

    struct GrabState {
        pressed_keys: HashSet<String>,
        suppressed_keys: HashSet<String>,
        combo_active: bool,
    }

    let grab_result = rdev::grab({
        let writer = ctx.writer.clone();
        let combos = ctx.combos.clone();
        let state = RefCell::new(GrabState {
            pressed_keys: HashSet::new(),
            suppressed_keys: HashSet::new(),
            combo_active: false,
        });
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

            if is_press {
                s.pressed_keys.insert(label.clone());

                let current_combos = combos.lock().map(|g| g.clone()).unwrap_or_default();

                if !s.combo_active
                    && matches_any_combo(&s.pressed_keys, &current_combos)
                {
                    s.combo_active = true;
                    let to_suppress = s.pressed_keys.clone();
                    s.suppressed_keys.extend(to_suppress);
                    return None;
                }

                if s.combo_active {
                    s.suppressed_keys.insert(label);
                    return None;
                }

                Some(event)
            } else {
                s.pressed_keys.remove(&label);

                if s.pressed_keys.is_empty() {
                    s.combo_active = false;
                }

                if s.suppressed_keys.remove(&label) {
                    return None;
                }

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
