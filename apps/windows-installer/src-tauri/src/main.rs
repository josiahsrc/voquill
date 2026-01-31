#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;

const EMBEDDED_INSTALLER: &[u8] = include_bytes!("../installer/Voquill_Setup.exe");

#[derive(Clone, serde::Serialize)]
struct InstallProgress {
    stage: String,
    progress: u8,
    message: String,
}

fn extract_installer() -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("Voquill_Setup.exe");

    std::fs::write(&installer_path, EMBEDDED_INSTALLER)
        .map_err(|e| format!("Failed to extract installer: {}", e))?;

    Ok(installer_path)
}

fn emit_progress(app: &AppHandle, stage: &str, progress: u8, message: &str) {
    let _ = app.emit(
        "install-progress",
        InstallProgress {
            stage: stage.to_string(),
            progress,
            message: message.to_string(),
        },
    );
}

#[tauri::command]
async fn start_installation(app: AppHandle) -> Result<(), String> {
    emit_progress(&app, "preparing", 5, "Preparing installation...");

    let installer_path = extract_installer()?;

    emit_progress(&app, "installing", 15, "Starting Voquill setup...");

    let mut child = Command::new(&installer_path)
        .args(["/S", "/D="])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start installer: {}", e))?;

    emit_progress(&app, "installing", 30, "Installing Voquill...");

    let progress_start = 30u32;
    let progress_range = 55u32;
    let steps = 10u32;

    for i in 0..steps {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        let progress = (progress_start + ((i + 1) * progress_range / steps)) as u8;
        emit_progress(&app, "installing", progress.min(85), "Installing Voquill...");
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for installer: {}", e))?;

    let _ = std::fs::remove_file(&installer_path);

    if !status.success() {
        emit_progress(&app, "error", 0, "Installation failed");
        return Err(format!("Installer exited with code: {:?}", status.code()));
    }

    emit_progress(&app, "complete", 100, "Installation complete!");

    Ok(())
}

#[tauri::command]
async fn launch_app() -> Result<(), String> {
    let app_path = get_installed_app_path()?;

    Command::new(&app_path)
        .spawn()
        .map_err(|e| format!("Failed to launch app: {}", e))?;

    Ok(())
}

fn get_installed_app_path() -> Result<PathBuf, String> {
    let local_app_data = std::env::var("LOCALAPPDATA").ok();
    let program_files = std::env::var("PROGRAMFILES").ok();

    let candidates = [
        ("Voquill (dev)", "Voquill (dev).exe"),
        ("Voquill", "Voquill.exe"),
    ];

    for (folder, exe) in candidates {
        if let Some(ref local) = local_app_data {
            let path = PathBuf::from(local).join(folder).join(exe);
            if path.exists() {
                return Ok(path);
            }
        }
        if let Some(ref pf) = program_files {
            let path = PathBuf::from(pf).join(folder).join(exe);
            if path.exists() {
                return Ok(path);
            }
        }
    }

    Err("Could not find installed Voquill application".to_string())
}

#[tauri::command]
async fn close_installer(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_installation,
            launch_app,
            close_installer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
