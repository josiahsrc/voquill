use crate::platform::keyboard::{
    debug_keys_enabled, key_raw_code, key_to_label, run_listen_loop, send_event_to_tcp,
    setup_listener_process, update_grab_hotkey_state, GrabDecision, GrabHotkeyState,
    KeyboardEventPayload, WireEventKind,
};
use rdev::{Event, EventType};
use std::cell::RefCell;
use std::collections::HashMap;

extern "C" {
    fn CGEventSourceKeyState(state_id: i32, key: u16) -> bool;
}

fn is_key_physically_pressed(key_code: u32) -> bool {
    unsafe { CGEventSourceKeyState(1, key_code as u16) }
}

fn scan_code(event: &Event) -> u32 {
    event.platform_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;

    struct GrabState {
        hotkeys: GrabHotkeyState,
        pressed_platform_codes: HashMap<String, u32>,
    }

    let grab_result = rdev::grab({
        let writer = ctx.writer.clone();
        let combos = ctx.combos.clone();
        let state = RefCell::new(GrabState {
            hotkeys: GrabHotkeyState::default(),
            pressed_platform_codes: HashMap::new(),
        });
        move |event| -> Option<Event> {
            let (key, is_press) = match event.event_type {
                EventType::KeyPress(key) => (key, true),
                EventType::KeyRelease(key) => (key, false),
                _ => return Some(event),
            };

            {
                let mut s = state.borrow_mut();
                let stale: Vec<(String, u32)> = s
                    .pressed_platform_codes
                    .iter()
                    .filter(|(_, &code)| !is_key_physically_pressed(code))
                    .map(|(label, &code)| (label.clone(), code))
                    .collect();

                for (stale_label, _) in &stale {
                    s.hotkeys.pressed_keys.remove(stale_label);
                    s.pressed_platform_codes.remove(stale_label);
                    s.hotkeys.suppressed_keys.remove(stale_label);

                    if debug_keys_enabled() {
                        eprintln!("[keys] Sweeping stale key: {stale_label}");
                    }

                    let release_payload = KeyboardEventPayload {
                        kind: WireEventKind::Release,
                        key_label: stale_label.clone(),
                        raw_code: None,
                        scan_code: 0,
                    };
                    send_event_to_tcp(&writer, &release_payload);
                }

                if !stale.is_empty() && s.hotkeys.pressed_keys.is_empty() {
                    s.hotkeys.combo_active = false;
                }
            }

            let label = key_to_label(key);
            let payload = KeyboardEventPayload {
                kind: if is_press {
                    WireEventKind::Press
                } else {
                    WireEventKind::Release
                },
                key_label: label.clone(),
                raw_code: key_raw_code(key),
                scan_code: event.platform_code,
            };
            send_event_to_tcp(&writer, &payload);

            let mut s = state.borrow_mut();
            if is_press {
                s.pressed_platform_codes
                    .insert(label.clone(), event.platform_code);
            } else {
                s.pressed_platform_codes.remove(&label);
            }

            let current_combos = combos.lock().map(|g| g.clone()).unwrap_or_default();
            if update_grab_hotkey_state(&mut s.hotkeys, &label, is_press, &current_combos)
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
