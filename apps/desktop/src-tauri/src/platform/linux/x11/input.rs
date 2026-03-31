use enigo::{Enigo, Key, KeyboardControllable};
use std::process::Command;
use std::sync::Mutex;
use std::{thread, time::Duration};

static CLIPBOARD_HOLD: Mutex<Option<arboard::Clipboard>> = Mutex::new(None);

pub fn paste_text(text: &str, keybind: Option<&str>) -> Result<(), String> {
    paste_via_clipboard(text, keybind).or_else(|err| {
        log::warn!("Clipboard paste failed ({err}), falling back to simulated typing");
        enigo_type_text(text)
    })
}

fn enigo_type_text(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));
    enigo.key_sequence(text);
    Ok(())
}

fn xdotool_available() -> bool {
    Command::new("xdotool")
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn xdotool_key(combo: &str) -> Result<(), String> {
    let output = Command::new("xdotool")
        .arg("key")
        .arg("--clearmodifiers")
        .arg(combo)
        .output()
        .map_err(|err| format!("xdotool failed: {err}"))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "xdotool exited {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

fn simulate_paste_keystroke(shift: bool) -> Result<(), String> {
    if xdotool_available() {
        let combo = if shift { "ctrl+shift+v" } else { "ctrl+v" };
        log::info!("Using xdotool for paste keystroke ({combo})");
        return xdotool_key(combo);
    }

    log::info!("xdotool not available, falling back to enigo");
    enigo_paste_keystroke(shift)
}

fn enigo_paste_keystroke(shift: bool) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));

    enigo.key_down(Key::Control);
    if shift {
        enigo.key_down(Key::Shift);
    }
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    if shift {
        enigo.key_up(Key::Shift);
    }
    enigo.key_up(Key::Control);
    Ok(())
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let shift = keybind == Some("ctrl+shift+v");
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    {
        let mut hold = CLIPBOARD_HOLD.lock().unwrap_or_else(|p| p.into_inner());
        *hold = Some(clipboard);
    }

    thread::sleep(Duration::from_millis(40));

    simulate_paste_keystroke(shift)?;

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        let mut hold = CLIPBOARD_HOLD.lock().unwrap_or_else(|p| p.into_inner());
        *hold = None;
        previous.restore();
    });

    Ok(())
}
