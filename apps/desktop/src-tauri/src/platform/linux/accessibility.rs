use super::wayland;
use crate::commands::{ScreenContextInfo, TextFieldInfo};
use arboard::Clipboard;
use enigo::{Enigo, Key, KeyboardControllable};
use std::{thread, time::Duration};

pub fn get_text_field_info() -> TextFieldInfo {
    eprintln!("[linux::accessibility] Text field info not implemented for Linux");

    TextFieldInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}

pub fn get_screen_context() -> ScreenContextInfo {
    eprintln!("[linux::accessibility] Screen context not implemented for Linux");

    ScreenContextInfo { screen_context: None }
}

pub fn get_selected_text() -> Option<String> {
    if wayland::is_wayland() {
        return wayland::wayland_get_selected_text();
    }

    let mut clipboard = Clipboard::new().ok()?;
    let previous = clipboard.get_text().ok();

    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));

    enigo.key_down(Key::Control);
    enigo.key_down(Key::Layout('c'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('c'));
    enigo.key_up(Key::Control);

    thread::sleep(Duration::from_millis(50));

    let selected = clipboard.get_text().ok();

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(100));
            if let Ok(mut cb) = Clipboard::new() {
                let _ = cb.set_text(old);
            }
        });
    }

    selected.filter(|s| !s.is_empty())
}
