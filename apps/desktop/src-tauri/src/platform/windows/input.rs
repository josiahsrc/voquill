use enigo::{Enigo, Key, KeyboardControllable};
use std::{env, thread, time::Duration};

pub(crate) fn paste_text_into_focused_field(text: &str, keybind: Option<&str>) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let override_text = env::var("VOQUILL_DEBUG_PASTE_TEXT").ok();
    let target = override_text.as_deref().unwrap_or(text);
    eprintln!(
        "[voquill] attempting to inject text ({} chars)",
        target.chars().count()
    );

    paste_via_clipboard(target, keybind).or_else(|err| {
        eprintln!("Clipboard paste failed ({err}). Falling back to simulated typing.");
        let mut enigo = Enigo::new();
        enigo.key_up(Key::Shift);
        enigo.key_up(Key::Control);
        enigo.key_up(Key::Alt);
        enigo.key_up(Key::Meta);
        thread::sleep(Duration::from_millis(50));
        enigo.key_click(Key::Escape);
        thread::sleep(Duration::from_millis(50));
        enigo.key_sequence(target);
        Ok(())
    })
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = clipboard.get_text().ok();
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(50));

    let mut enigo = Enigo::new();

    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    enigo.key_up(Key::Meta);
    thread::sleep(Duration::from_millis(50));

    enigo.key_click(Key::Escape);
    thread::sleep(Duration::from_millis(50));

    // Use configurable keybind or default to Ctrl+V
    let use_shift = keybind == Some("ctrl+shift+v");

    enigo.key_down(Key::Control);
    if use_shift {
        enigo.key_down(Key::Shift);
    }
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(20));
    enigo.key_up(Key::Layout('v'));
    if use_shift {
        enigo.key_up(Key::Shift);
    }
    enigo.key_up(Key::Control);

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
