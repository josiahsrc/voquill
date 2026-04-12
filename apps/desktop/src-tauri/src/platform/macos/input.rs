use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::{thread, time::Duration};

use super::accessibility;

const KEY_C: CGKeyCode = 8;
const KEY_V: CGKeyCode = 9;

pub(crate) fn paste_text_into_focused_field(
    text: &str,
    _keybind: Option<&str>,
) -> Result<crate::commands::PasteMethod, String> {
    if text.trim().is_empty() {
        return Ok(crate::commands::PasteMethod::Accessibility);
    }

    if !accessibility::is_text_input_focused() {
        log::info!("No text input focused, signalling noTarget for clipboard fallback");
        return Ok(crate::commands::PasteMethod::NoTarget);
    }

    match accessibility::insert_text_at_cursor(text) {
        Ok(accessibility::TextInsertOutcome::Inserted) => {
            Ok(crate::commands::PasteMethod::Accessibility)
        }
        Ok(accessibility::TextInsertOutcome::RequiresClipboardPaste(reason)) => {
            log::warn!(
                "Accessibility insert failed ({reason}), falling back to clipboard paste"
            );
            paste_via_clipboard(text)?;
            Ok(crate::commands::PasteMethod::Clipboard)
        }
        Ok(accessibility::TextInsertOutcome::NoTarget(reason)) => {
            log::warn!("No text field target: {reason}");
            Ok(crate::commands::PasteMethod::NoTarget)
        }
        Err(err) => {
            log::error!("Accessibility insert failed unexpectedly: {err}");
            paste_via_clipboard(text)?;
            Ok(crate::commands::PasteMethod::Clipboard)
        }
    }
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(50));
    simulate_cmd_v()?;

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        previous.restore();
    });

    Ok(())
}

pub(crate) fn simulate_cmd_c() -> Result<(), String> {
    // Use a private event source so physically-held modifier keys (e.g. Fn from the
    // hotkey combo) don't contaminate the synthetic Cmd+C event.
    let source = CGEventSource::new(CGEventSourceStateID::Private)
        .map_err(|_| "failed to create event source")?;

    let flags = CGEventFlags::CGEventFlagCommand;

    let key_down = CGEvent::new_keyboard_event(source.clone(), KEY_C, true)
        .map_err(|_| "failed to create key-down event")?;
    key_down.set_flags(flags);
    key_down.post(CGEventTapLocation::HID);

    thread::sleep(Duration::from_millis(10));

    let key_up = CGEvent::new_keyboard_event(source, KEY_C, false)
        .map_err(|_| "failed to create key-up event")?;
    key_up.set_flags(flags);
    key_up.post(CGEventTapLocation::HID);

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
