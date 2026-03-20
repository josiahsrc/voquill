use std::process::Command;
use std::sync::Mutex;
use std::{thread, time::Duration};

static CLIPBOARD_HOLD: Mutex<Option<arboard::Clipboard>> = Mutex::new(None);

pub(crate) fn clipboard_get() -> Result<String, String> {
    arboard::Clipboard::new()
        .and_then(|mut cb| cb.get_text())
        .map_err(|err| format!("clipboard get failed: {err}"))
}

pub(crate) fn clipboard_set(text: &str) -> Result<(), String> {
    let mut cb = arboard::Clipboard::new()
        .map_err(|err| format!("clipboard create failed: {err}"))?;
    cb.set_text(text.to_string())
        .map_err(|err| format!("clipboard set failed: {err}"))?;
    let mut guard = CLIPBOARD_HOLD.lock().unwrap_or_else(|p| p.into_inner());
    *guard = Some(cb);
    Ok(())
}

// --- ydotool (works on all Wayland compositors via /dev/uinput) ---

fn ydotool_available() -> bool {
    Command::new("ydotool")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok()
}

fn ydotool_key(combo: &str) -> Result<(), String> {
    let output = Command::new("ydotool")
        .arg("key")
        .arg(combo)
        .output()
        .map_err(|err| format!("ydotool failed: {err}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("ydotool exited with non-zero status: {stderr}"))
    }
}

fn ydotool_paste(use_shift: bool) -> Result<(), String> {
    if use_shift {
        ydotool_key("ctrl+shift+v")
    } else {
        ydotool_key("ctrl+v")
    }
}

fn ydotool_copy() -> Result<(), String> {
    ydotool_key("ctrl+c")
}

// --- wtype (works on Sway/Hyprland via virtual-keyboard protocol) ---

fn wtype_bin() -> Result<std::path::PathBuf, String> {
    super::compositor::wtype_path()
        .cloned()
        .ok_or_else(|| "wtype not found (not bundled and not in PATH)".to_string())
}

pub fn wtype_key(modifiers: &[&str], key: &str) -> Result<(), String> {
    let mut cmd = Command::new(wtype_bin()?);
    for m in modifiers {
        cmd.arg("-M").arg(*m);
    }
    cmd.arg("-k").arg(key);
    for m in modifiers.iter().rev() {
        cmd.arg("-m").arg(*m);
    }
    let status = cmd.status().map_err(|err| format!("wtype failed: {err}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("wtype exited with non-zero status".into())
    }
}

pub fn wtype_text(text: &str) -> Result<(), String> {
    let status = Command::new(wtype_bin()?)
        .arg("--")
        .arg(text)
        .status()
        .map_err(|err| format!("wtype failed: {err}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("wtype exited with non-zero status".into())
    }
}

// --- Simulate paste/copy keystrokes ---

fn simulate_paste_keystroke(use_shift: bool) -> Result<(), String> {
    if ydotool_available() {
        log::info!("Using ydotool for paste keystroke");
        return ydotool_paste(use_shift);
    }

    log::info!("ydotool not available, trying wtype for paste keystroke");
    if use_shift {
        wtype_key(&["ctrl", "shift"], "v")
    } else {
        wtype_key(&["ctrl"], "v")
    }
}

pub(crate) fn simulate_copy_keystroke() -> Result<(), String> {
    if ydotool_available() {
        return ydotool_copy();
    }
    wtype_key(&["ctrl"], "c")
}

// --- Public API ---

pub fn paste_text(text: &str, keybind: Option<&str>) -> Result<(), String> {
    paste_via_clipboard(text, keybind).or_else(|err| {
        log::warn!("Wayland paste failed ({err}), trying wtype text fallback");
        wtype_text(text)
    })
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let previous = clipboard_get().ok();

    clipboard_set(text)?;
    thread::sleep(Duration::from_millis(40));

    let use_shift = match keybind {
        Some(kb) => kb == "ctrl+shift+v",
        None => false,
    };

    simulate_paste_keystroke(use_shift)?;

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            let _ = clipboard_set(&old);
        });
    }

    Ok(())
}
