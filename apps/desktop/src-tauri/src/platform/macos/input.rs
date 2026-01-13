use core_graphics::event::CGEventTapLocation;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

// Note: macOS uses native text injection via CGEvent, so the keybind parameter is ignored.
// The text is injected directly at the OS level, bypassing clipboard and paste shortcuts.
pub(crate) fn paste_text_into_focused_field(text: &str, _keybind: Option<&str>) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source".to_string())?;

    let key_down = core_graphics::event::CGEvent::new_keyboard_event(source.clone(), 0, true)
        .map_err(|_| "failed to create key-down event".to_string())?;
    key_down.set_string(text);
    key_down.post(CGEventTapLocation::HID);

    let key_up = core_graphics::event::CGEvent::new_keyboard_event(source, 0, false)
        .map_err(|_| "failed to create key-up event".to_string())?;
    key_up.set_string("");
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}
