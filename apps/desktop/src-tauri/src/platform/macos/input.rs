use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::{thread, time::Duration};

use super::accessibility;

const KEY_V: CGKeyCode = 9;

pub(crate) fn paste_text_into_focused_field(text: &str, _keybind: Option<&str>) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    match accessibility::insert_text_at_cursor(text) {
        Ok(()) => Ok(()),
        Err(err) => {
            eprintln!("[macos::input] accessibility insert failed ({err}), falling back to clipboard paste");
            paste_via_clipboard(text)
        }
    }
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = clipboard.get_text().ok();
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(50));
    simulate_cmd_v()?;

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.set_text(old);
            }
        });
    }

    Ok(())
}

fn simulate_cmd_v() -> Result<(), String> {
    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source")?;

    let key_down = CGEvent::new_keyboard_event(source.clone(), KEY_V, true)
        .map_err(|_| "failed to create key-down event")?;
    key_down.set_flags(CGEventFlags::CGEventFlagCommand);
    key_down.post(CGEventTapLocation::HID);

    thread::sleep(Duration::from_millis(10));

    let key_up = CGEvent::new_keyboard_event(source, KEY_V, false)
        .map_err(|_| "failed to create key-up event")?;
    key_up.set_flags(CGEventFlags::CGEventFlagCommand);
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}
