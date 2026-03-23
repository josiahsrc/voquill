use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, Output, Stdio};
use std::sync::Mutex;
use std::time::Instant;
use std::{thread, time::Duration};

static CLIPBOARD_HOLD: Mutex<Option<arboard::Clipboard>> = Mutex::new(None);
static WL_COPY_HOLD: Mutex<Option<Child>> = Mutex::new(None);
static YDOTOOLD_CHILD: Mutex<Option<Child>> = Mutex::new(None);
const WL_CLIPBOARD_TIMEOUT_MS: u64 = 150;
const YDOTOOLD_START_TIMEOUT_MS: u64 = 1500;

enum ClipboardSnapshot {
    Text(String),
    Image(arboard::ImageData<'static>),
    Empty,
}

pub(crate) fn clipboard_get() -> Result<String, String> {
    if wl_paste_available() {
        let output = run_command_with_timeout(
            Command::new("wl-paste")
                .arg("--no-newline")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped()),
            Duration::from_millis(WL_CLIPBOARD_TIMEOUT_MS),
            "wl-paste",
        )?;

        if output.status.success() {
            return String::from_utf8(output.stdout)
                .map_err(|err| format!("wl-paste returned invalid UTF-8: {err}"));
        }

        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("wl-paste exited with non-zero status: {stderr}"));
    }

    arboard::Clipboard::new()
        .and_then(|mut cb| cb.get_text())
        .map_err(|err| format!("clipboard get failed: {err}"))
}

pub(crate) fn clipboard_set(text: &str) -> Result<(), String> {
    if wl_copy_available() {
        return clipboard_set_with_wl_copy(text);
    }

    log::info!("wl-copy not available, falling back to arboard clipboard backend");
    clipboard_set_with_arboard(text)
}

fn clipboard_set_with_arboard(text: &str) -> Result<(), String> {
    clear_wl_copy_hold();

    let mut cb = arboard::Clipboard::new()
        .map_err(|err| format!("clipboard create failed: {err}"))?;
    cb.set_text(text.to_string())
        .map_err(|err| format!("clipboard set failed: {err}"))?;
    let mut guard = CLIPBOARD_HOLD.lock().unwrap_or_else(|p| p.into_inner());
    *guard = Some(cb);
    log::info!("Stored clipboard text via arboard");
    Ok(())
}

fn clipboard_set_with_wl_copy(text: &str) -> Result<(), String> {
    clear_wl_copy_hold();

    let mut child = Command::new("wl-copy")
        .arg("--foreground")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| format!("failed to start wl-copy: {err}"))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or("wl-copy stdin was unavailable")?;
        stdin
            .write_all(text.as_bytes())
            .map_err(|err| format!("failed to write clipboard text to wl-copy: {err}"))?;
    }

    let _ = child.stdin.take();

    thread::sleep(Duration::from_millis(20));

    match child.try_wait() {
        Ok(Some(status)) => {
            let output = child
                .wait_with_output()
                .map_err(|err| format!("failed to read wl-copy output: {err}"))?;

            if status.success() {
                log::info!("Stored clipboard text via wl-copy");
                return Ok(());
            }

            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("wl-copy exited with non-zero status: {stderr}"));
        }
        Ok(None) => {
            let mut guard = WL_COPY_HOLD.lock().unwrap_or_else(|p| p.into_inner());
            *guard = Some(child);
            log::info!("Stored clipboard text via wl-copy");
            return Ok(());
        }
        Err(err) => return Err(format!("failed to check wl-copy status: {err}")),
    }
}

fn clear_wl_copy_hold() {
    let mut guard = WL_COPY_HOLD.lock().unwrap_or_else(|p| p.into_inner());
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn run_command_with_timeout(
    command: &mut Command,
    timeout: Duration,
    label: &str,
) -> Result<Output, String> {
    let mut child = command
        .spawn()
        .map_err(|err| format!("{label} failed to start: {err}"))?;
    let started = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(_)) => {
                return child
                    .wait_with_output()
                    .map_err(|err| format!("{label} failed to collect output: {err}"));
            }
            Ok(None) => {
                if started.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "{label} timed out after {}ms",
                        timeout.as_millis()
                    ));
                }
                thread::sleep(Duration::from_millis(10));
            }
            Err(err) => return Err(format!("{label} failed while waiting: {err}")),
        }
    }
}

fn wl_copy_available() -> bool {
    Command::new("wl-copy")
        .arg("--help")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}

fn wl_paste_available() -> bool {
    Command::new("wl-paste")
        .arg("--help")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}

fn save_clipboard() -> ClipboardSnapshot {
    if let Ok(text) = clipboard_get() {
        return ClipboardSnapshot::Text(text);
    }

    log::warn!("Skipping clipboard snapshot because the current clipboard could not be read quickly");

    if let Ok(mut cb) = arboard::Clipboard::new() {
        if let Ok(image) = cb.get_image() {
            return ClipboardSnapshot::Image(image);
        }
    }

    ClipboardSnapshot::Empty
}

fn restore_clipboard(snapshot: ClipboardSnapshot) {
    match snapshot {
        ClipboardSnapshot::Text(text) => {
            if let Err(err) = clipboard_set(&text) {
                log::warn!("failed to restore clipboard text: {err}");
            }
        }
        ClipboardSnapshot::Image(image) => {
            if let Ok(mut cb) = arboard::Clipboard::new() {
                if let Err(err) = cb.set_image(image) {
                    log::warn!("failed to restore clipboard image: {err}");
                }
            }
        }
        ClipboardSnapshot::Empty => {}
    }
}

fn paste_combo(keybind: Option<&str>) -> &'static str {
    if keybind == Some("ctrl+shift+v") {
        "ctrl+shift+v"
    } else {
        "ctrl+v"
    }
}

// --- ydotool (works on all Wayland compositors via /dev/uinput) ---

fn ydotool_available() -> bool {
    Command::new("ydotool")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok()
}

fn ydotoold_available() -> bool {
    Command::new("ydotoold")
        .arg("--help")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}

fn ydotool_socket_path() -> Option<PathBuf> {
    std::env::var_os("YDOTOOL_SOCKET")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("XDG_RUNTIME_DIR")
                .map(PathBuf::from)
                .map(|dir| dir.join(".ydotool_socket"))
        })
}

fn ydotool_socket_present() -> bool {
    let Some(path) = ydotool_socket_path() else {
        return false;
    };

    path.exists()
}

fn remove_ydotool_socket() {
    let Some(path) = ydotool_socket_path() else {
        return;
    };

    if path.exists() {
        match std::fs::remove_file(&path) {
            Ok(()) => log::warn!("Removed ydotool socket at {}", path.display()),
            Err(err) => log::warn!(
                "Failed to remove ydotool socket at {}: {err}",
                path.display()
            ),
        }
    }
}

fn wait_for_ydotoold_socket(child: &mut Child, timeout: Duration) -> Result<(), String> {
    let started = Instant::now();

    loop {
        if ydotool_socket_present() {
            return Ok(());
        }

        match child.try_wait() {
            Ok(Some(_status)) => {
                return Err("ydotoold exited before creating its socket".to_string());
            }
            Ok(None) => {}
            Err(err) => return Err(format!("failed while waiting for ydotoold: {err}")),
        }

        if started.elapsed() >= timeout {
            return Err(format!(
                "ydotoold did not create its socket within {}ms",
                timeout.as_millis()
            ));
        }

        thread::sleep(Duration::from_millis(25));
    }
}

fn ensure_ydotoold_running() -> Result<(), String> {
    if !ydotoold_available() {
        return Ok(());
    }

    if ydotool_socket_present() {
        return Ok(());
    }

    let mut guard = YDOTOOLD_CHILD.lock().unwrap_or_else(|p| p.into_inner());
    if let Some(child) = guard.as_mut() {
        if ydotool_socket_present() {
            return Ok(());
        }

        match child.try_wait() {
            Ok(Some(_)) => {
                let _ = guard.take();
            }
            Ok(None) => {
                return wait_for_ydotoold_socket(
                    child,
                    Duration::from_millis(YDOTOOLD_START_TIMEOUT_MS),
                );
            }
            Err(err) => {
                let _ = guard.take();
                return Err(format!("failed to inspect existing ydotoold process: {err}"));
            }
        }
    }

    spawn_ydotoold(&mut guard)
}

fn spawn_ydotoold(guard: &mut Option<Child>) -> Result<(), String> {
    remove_ydotool_socket();

    let mut command = Command::new("ydotoold");
    command.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::piped());

    if let Some(path) = ydotool_socket_path() {
        command.arg("--socket-path").arg(path);
    }

    let mut child = command
        .spawn()
        .map_err(|err| format!("failed to start ydotoold automatically: {err}"))?;

    wait_for_ydotoold_socket(&mut child, Duration::from_millis(YDOTOOLD_START_TIMEOUT_MS))?;
    log::info!("Started ydotoold automatically for Wayland input simulation");
    *guard = Some(child);
    Ok(())
}

fn restart_ydotoold() -> Result<(), String> {
    if !ydotoold_available() {
        return Ok(());
    }

    let mut guard = YDOTOOLD_CHILD.lock().unwrap_or_else(|p| p.into_inner());
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    spawn_ydotoold(&mut guard)
}

pub(crate) fn warm_runtime_helpers() {
    if ydotool_available() {
        if let Err(err) = ensure_ydotoold_running() {
            log::warn!("Failed to warm ydotoold automatically: {err}");
        }
    }
}

fn ydotool_key(combo: &str) -> Result<(), String> {
    ensure_ydotoold_running()?;

    match ydotool_key_once(combo) {
        Ok(()) => Ok(()),
        Err(first_err) => {
            if !ydotoold_available() {
                return Err(first_err);
            }

            log::warn!(
                "ydotool command failed, restarting ydotoold and retrying: {first_err}"
            );
            restart_ydotoold()?;
            ydotool_key_once(combo).map_err(|retry_err| {
                format!(
                    "{first_err}; retry after restarting ydotoold also failed: {retry_err}"
                )
            })
        }
    }
}

fn ydotool_key_once(combo: &str) -> Result<(), String> {

    if let Some(sequence) = ydotool_keycode_fallback(combo) {
        let keycode_output = Command::new("ydotool")
            .arg("key")
            .args(sequence.split_whitespace())
            .output()
            .map_err(|err| format!("ydotool keycode sequence failed: {err}"))?;

        if keycode_output.status.success() {
            log::info!("Used ydotool keycode sequence for {combo}");
            return Ok(());
        }

        let keycode_stderr = String::from_utf8_lossy(&keycode_output.stderr);
        let symbolic_output = Command::new("ydotool")
            .arg("key")
            .arg(combo)
            .output()
            .map_err(|err| format!("ydotool symbolic combo failed: {err}"))?;

        if symbolic_output.status.success() {
            log::info!("Used symbolic ydotool combo for {combo} after keycode failure");
            return Ok(());
        }

        let symbolic_stderr = String::from_utf8_lossy(&symbolic_output.stderr);
        return Err(format!(
            "ydotool keycode sequence failed: {keycode_stderr}; symbolic combo also failed: {symbolic_stderr}"
        ));
    }

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

fn ydotool_keycode_fallback(combo: &str) -> Option<&'static str> {
    match combo {
        "ctrl+c" => Some("29:1 46:1 46:0 29:0"),
        "ctrl+v" => Some("29:1 47:1 47:0 29:0"),
        "ctrl+shift+v" => Some("29:1 42:1 47:1 47:0 42:0 29:0"),
        _ => None,
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

fn simulate_paste_keystroke(keybind: Option<&str>) -> Result<(), String> {
    let combo = paste_combo(keybind);

    if ydotool_available() {
        log::info!("Using ydotool for paste keystroke: {combo}");
        match ydotool_key(combo) {
            Ok(()) => return Ok(()),
            Err(err) => log::warn!(
                "ydotool paste keystroke failed ({err}), trying wtype fallback"
            ),
        }
    }

    log::info!("ydotool not available, trying wtype for paste keystroke: {combo}");
    if combo == "ctrl+shift+v" {
        wtype_key(&["ctrl", "shift"], "v")
    } else {
        wtype_key(&["ctrl"], "v")
    }
}

pub(crate) fn simulate_copy_keystroke() -> Result<(), String> {
    if ydotool_available() {
        match ydotool_copy() {
            Ok(()) => return Ok(()),
            Err(err) => log::warn!("ydotool copy keystroke failed ({err}), trying wtype"),
        }
    }
    wtype_key(&["ctrl"], "c")
}

// --- Public API ---

pub fn paste_text(text: &str, keybind: Option<&str>) -> Result<(), String> {
    paste_via_clipboard(text, keybind).or_else(|err| {
        log::warn!("Wayland paste failed ({err}), trying wtype text fallback");
        wtype_text(text).map_err(|_fallback_err| {
            format!(
                "Transcript copied to clipboard. Automatic paste failed on Wayland; paste manually and verify ydotool or wtype setup."
            )
        })
    })
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let previous = save_clipboard();

    clipboard_set(text)?;
    log::info!("Clipboard updated with transcript text ({} chars)", text.chars().count());
    thread::sleep(Duration::from_millis(40));

    simulate_paste_keystroke(keybind)?;

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        restore_clipboard(previous);
    });

    Ok(())
}
