use crate::commands::AccessibilityInfo;
use arboard::Clipboard;
use enigo::{Enigo, Key, KeyboardControllable};
use std::{thread, time::Duration};

/// Get accessibility information about the currently focused text field.
/// Linux AT-SPI integration is not implemented for this POC.
pub fn get_accessibility_info() -> AccessibilityInfo {
    eprintln!("[linux::accessibility] Accessibility info not implemented for Linux");

    AccessibilityInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
        screen_context: None,
    }
}

pub fn set_text_field_value(value: &str) -> Result<(), String> {
    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
    let previous = clipboard.get_text().ok();

    clipboard
        .set_text(value.to_string())
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    thread::sleep(Duration::from_millis(40));

    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));

    // Select all (Ctrl+A)
    enigo.key_down(Key::Control);
    enigo.key_down(Key::Layout('a'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('a'));
    enigo.key_up(Key::Control);
    thread::sleep(Duration::from_millis(30));

    // Paste (Ctrl+V)
    enigo.key_down(Key::Control);
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    enigo.key_up(Key::Control);

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            if let Ok(mut cb) = Clipboard::new() {
                let _ = cb.set_text(old);
            }
        });
    }

    Ok(())
}
