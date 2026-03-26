use crate::platform::keyboard::{
    debug_keys_enabled, key_raw_code, key_to_label, run_listen_loop, send_event_to_tcp,
    setup_listener_process, update_grab_hotkey_state, GrabDecision, GrabHotkeyState,
    KeyboardEventPayload, WireEventKind,
};
use rdev::{Event, EventType};
use std::cell::RefCell;
use std::collections::HashMap;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, MapVirtualKeyW, MAPVK_VSC_TO_VK_EX,
};

#[derive(Default)]
struct GrabState {
    hotkeys: GrabHotkeyState,
    pressed_scan_codes: HashMap<String, u32>,
}

fn is_scan_code_physically_pressed(scan_code: u32) -> Option<bool> {
    let virtual_key = unsafe { MapVirtualKeyW(scan_code, MAPVK_VSC_TO_VK_EX) };
    if virtual_key == 0 {
        return None;
    }

    let key_state = unsafe { GetAsyncKeyState(virtual_key as i32) };
    Some((key_state as u16 & 0x8000) != 0)
}

fn sweep_stale_pressed_keys(
    state: &mut GrabState,
    is_pressed: impl Fn(u32) -> Option<bool>,
) -> Vec<(String, u32)> {
    let stale: Vec<(String, u32)> = state
        .pressed_scan_codes
        .iter()
        .filter_map(|(label, &scan_code)| match is_pressed(scan_code) {
            Some(false) => Some((label.clone(), scan_code)),
            _ => None,
        })
        .collect();

    for (label, _) in &stale {
        state.hotkeys.pressed_keys.remove(label);
        state.hotkeys.suppressed_keys.remove(label);
        state.pressed_scan_codes.remove(label);
    }

    if !stale.is_empty() && state.hotkeys.pressed_keys.is_empty() {
        state.hotkeys.combo_active = false;
    }

    stale
}

fn scan_code(event: &Event) -> u32 {
    event.position_code
}

pub fn run_listener_process() -> Result<(), String> {
    let ctx = setup_listener_process()?;

    rdev::set_get_key_unicode(false);
    let grab_result = rdev::grab({
        let writer = ctx.writer.clone();
        let combos = ctx.combos.clone();
        let state = RefCell::new(GrabState::default());
        move |event| -> Option<Event> {
            let (key, is_press) = match event.event_type {
                EventType::KeyPress(key) => (key, true),
                EventType::KeyRelease(key) => (key, false),
                _ => return Some(event),
            };

            if !is_press {
                let mut s = state.borrow_mut();
                let stale = sweep_stale_pressed_keys(&mut s, is_scan_code_physically_pressed);

                for (stale_label, stale_scan_code) in stale {
                    if debug_keys_enabled() {
                        eprintln!("[keys] Sweeping stale key: {stale_label}");
                    }

                    let release_payload = KeyboardEventPayload {
                        kind: WireEventKind::Release,
                        key_label: stale_label,
                        raw_code: None,
                        scan_code: stale_scan_code,
                    };
                    send_event_to_tcp(&writer, &release_payload);
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
                scan_code: event.position_code,
            };
            send_event_to_tcp(&writer, &payload);

            let mut s = state.borrow_mut();
            if is_press {
                s.pressed_scan_codes
                    .insert(label.clone(), event.position_code);
            } else {
                s.pressed_scan_codes.remove(&label);
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

#[cfg(test)]
mod tests {
    use super::{sweep_stale_pressed_keys, GrabState};

    fn scan_state(entries: &[(&str, u32)]) -> GrabState {
        let mut state = GrabState::default();
        for (label, scan_code) in entries {
            state.hotkeys.pressed_keys.insert((*label).to_string());
            state
                .pressed_scan_codes
                .insert((*label).to_string(), *scan_code);
        }
        state
    }

    #[test]
    fn sweeps_stale_key_from_pressed_and_suppressed_sets() {
        let mut state = scan_state(&[("ShiftLeft", 42), ("F1", 59)]);
        state.hotkeys.combo_active = true;
        state
            .hotkeys
            .suppressed_keys
            .insert("ShiftLeft".to_string());

        let swept = sweep_stale_pressed_keys(&mut state, |scan_code| match scan_code {
            42 => Some(false),
            59 => Some(true),
            _ => None,
        });

        assert_eq!(swept, vec![("ShiftLeft".to_string(), 42)]);
        assert!(!state.hotkeys.pressed_keys.contains("ShiftLeft"));
        assert!(!state.hotkeys.suppressed_keys.contains("ShiftLeft"));
        assert!(!state.pressed_scan_codes.contains_key("ShiftLeft"));
        assert!(state.hotkeys.combo_active);
    }

    #[test]
    fn clears_combo_active_when_stale_sweep_empties_state() {
        let mut state = scan_state(&[("ShiftLeft", 42)]);
        state.hotkeys.combo_active = true;
        state
            .hotkeys
            .suppressed_keys
            .insert("ShiftLeft".to_string());

        let swept = sweep_stale_pressed_keys(&mut state, |_scan_code| Some(false));

        assert_eq!(swept, vec![("ShiftLeft".to_string(), 42)]);
        assert!(state.hotkeys.pressed_keys.is_empty());
        assert!(state.hotkeys.suppressed_keys.is_empty());
        assert!(!state.hotkeys.combo_active);
    }

    #[test]
    fn skips_unknown_physical_state_checks() {
        let mut state = scan_state(&[("ShiftLeft", 42)]);
        state.hotkeys.combo_active = true;

        let swept = sweep_stale_pressed_keys(&mut state, |_scan_code| None);

        assert!(swept.is_empty());
        assert!(state.hotkeys.pressed_keys.contains("ShiftLeft"));
        assert!(state.hotkeys.combo_active);
    }
}
