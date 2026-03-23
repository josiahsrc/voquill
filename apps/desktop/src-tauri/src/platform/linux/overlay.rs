use std::io::{BufRead, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

use crate::domain::OverlayPhase;

pub struct PillProcess {
    _child: Child,
    stdin: Mutex<ChildStdin>,
}

impl PillProcess {
    pub fn send(&self, msg: &str) {
        if let Ok(mut stdin) = self.stdin.lock() {
            if let Err(e) = stdin.write_all(msg.as_bytes())
                .and_then(|_| stdin.write_all(b"\n"))
                .and_then(|_| stdin.flush())
            {
                log::warn!("Failed to write to pill process: {e}");
            }
        }
    }
}

pub fn should_use_native_overlays() -> bool {
    true
}

pub fn try_create_native_overlays(app: &tauri::AppHandle) -> bool {
    if try_create_pill_overlay(app) {
        log::info!("Using native overlays via GTK4 layer-shell");
        true
    } else {
        log::warn!("Native overlay not available, falling back to Tauri overlays");
        false
    }
}

pub fn notify_phase(app: &tauri::AppHandle, phase: &OverlayPhase) {
    if let Some(pill) = app.try_state::<std::sync::Arc<PillProcess>>() {
        let phase_str = match phase {
            OverlayPhase::Idle => "idle",
            OverlayPhase::Recording => "recording",
            OverlayPhase::Loading => "loading",
        };
        pill.send(&format!(r#"{{"type":"phase","phase":"{phase_str}"}}"#));
    }
}

pub fn notify_audio_levels(app: &tauri::AppHandle, levels: &[f32]) {
    if let Some(pill) = app.try_state::<std::sync::Arc<PillProcess>>() {
        if let Ok(json) = serde_json::to_string(&serde_json::json!({"type": "levels", "levels": levels})) {
            pill.send(&json);
        }
    }
}

pub fn notify_style_info(app: &tauri::AppHandle, count: u32, name: &str) {
    if let Some(pill) = app.try_state::<std::sync::Arc<PillProcess>>() {
        if let Ok(json) = serde_json::to_string(&serde_json::json!({
            "type": "style_info",
            "count": count,
            "name": name,
        })) {
            pill.send(&json);
        }
    }
}

fn try_create_pill_overlay(app: &tauri::AppHandle) -> bool {
    let Some(pill_path) = resolve_pill_binary_path(app) else {
        log::warn!("GTK4 pill binary not found");
        return false;
    };

    log::info!("Spawning GTK4 pill overlay from: {}", pill_path.display());

    let mut child = match Command::new(&pill_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
    {
        Ok(child) => child,
        Err(err) => {
            log::warn!("Failed to spawn pill overlay: {err}");
            return false;
        }
    };

    let stdin = match child.stdin.take() {
        Some(stdin) => stdin,
        None => {
            log::warn!("Pill overlay process has no stdin");
            return false;
        }
    };

    let stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            log::warn!("Pill overlay process has no stdout");
            return false;
        }
    };

    let reader = match wait_for_ready(stdout) {
        Some(reader) => reader,
        None => {
            log::warn!("Pill overlay did not report ready");
            let _ = child.kill();
            return false;
        }
    };

    let process = std::sync::Arc::new(PillProcess {
        _child: child,
        stdin: Mutex::new(stdin),
    });

    app.manage(process);

    start_stdout_reader(app.clone(), reader);

    log::info!("Native GTK4 pill overlay is active");
    true
}

fn wait_for_ready(
    stdout: ChildStdout,
) -> Option<std::io::BufReader<ChildStdout>> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut reader = std::io::BufReader::new(stdout);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) | Err(_) => {
                    let _ = tx.send(None);
                    return;
                }
                Ok(_) => {
                    if line.contains("\"ready\"") {
                        let _ = tx.send(Some(reader));
                        return;
                    }
                }
            }
        }
    });

    rx.recv_timeout(std::time::Duration::from_secs(5))
        .ok()
        .flatten()
}

fn start_stdout_reader(app: tauri::AppHandle, reader: std::io::BufReader<ChildStdout>) {
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    if line.contains("\"click\"") {
                        let _ = app.emit_to("main", "on-click-dictate", ());
                    } else if line.contains("\"style_switch\"") {
                        if line.contains("\"forward\"") {
                            let _ = app.emit_to("main", "tone-switch-forward", ());
                        } else if line.contains("\"backward\"") {
                            let _ = app.emit_to("main", "tone-switch-backward", ());
                        }
                    }
                }
            }
        }
        log::info!("Pill overlay process stdout closed");
    });
}

fn resolve_pill_binary_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let path = resource_dir.join("resources/voquill-gtk4-pill");
        if path.exists() {
            return Some(path);
        }
    }

    if cfg!(debug_assertions) {
        if let Ok(exe) = std::env::current_exe() {
            let mut dir = exe.parent();
            while let Some(d) = dir {
                let dev_path = d.join("packages/rust_gtk4_pill/target/debug/voquill-gtk4-pill");
                if dev_path.exists() {
                    return Some(dev_path);
                }
                dir = d.parent();
            }
        }
    }

    None
}
