use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::{thread, time::Duration};

use super::accessibility;

const KEY_SPACE: CGKeyCode = 49;
const KEY_V: CGKeyCode = 9;

pub(crate) fn paste_text_into_focused_field(
    text: &str,
    _keybind: Option<&str>,
) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    match accessibility::insert_text_at_cursor(text) {
        Ok(()) => Ok(()),
        Err(err) => {
            log::warn!("Accessibility insert failed ({err}), falling back to clipboard paste");
            paste_via_clipboard(text)
        }
    }
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let trimmed_text = text.trim_end_matches(' ');
    let trailing_spaces = text.len() - trimmed_text.len();

    if !trimmed_text.is_empty() {
        let mut clipboard =
            arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
        let previous = crate::platform::SavedClipboard::save(&mut clipboard);
        clipboard
            .set_text(trimmed_text.to_string())
            .map_err(|err| format!("failed to store clipboard text: {err}"))?;

        thread::sleep(Duration::from_millis(50));
        simulate_cmd_v()?;

        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            previous.restore();
        });
    }

    for _ in 0..trailing_spaces {
        thread::sleep(Duration::from_millis(10));
        simulate_keypress(KEY_SPACE, CGEventFlags::empty())?;
    }

    Ok(())
}

fn simulate_cmd_v() -> Result<(), String> {
    simulate_keypress(KEY_V, CGEventFlags::CGEventFlagCommand)
}

fn simulate_keypress(key_code: CGKeyCode, flags: CGEventFlags) -> Result<(), String> {
    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source")?;

    let key_down = CGEvent::new_keyboard_event(source.clone(), key_code, true)
        .map_err(|_| "failed to create key-down event")?;
    key_down.set_flags(flags);
    key_down.post(CGEventTapLocation::HID);

    thread::sleep(Duration::from_millis(10));

    let key_up = CGEvent::new_keyboard_event(source, key_code, false)
        .map_err(|_| "failed to create key-up event")?;
    key_up.set_flags(flags);
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}
