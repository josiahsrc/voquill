#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, serde::Serialize)]
struct InstallProgress {
    stage: String,
    progress: u8,
    message: String,
}

fn get_bundled_installer(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let installer_path = resource_path.join("installer").join("Voquill_Setup.exe");

    if !installer_path.exists() {
        return Err(format!(
            "Bundled installer not found at: {}",
            installer_path.display()
        ));
    }

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

    let installer_path = get_bundled_installer(&app)?;

    emit_progress(&app, "installing", 15, "Starting Voquill setup...");

    let mut child = Command::new(&installer_path)
        .args(["/S", "/D="])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start installer: {}", e))?;

    emit_progress(&app, "installing", 30, "Installing Voquill...");

    let mut progress = 30u8;
    let progress_increment = 50u8;
    let steps = 10;

    for i in 0..steps {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        progress = 30 + ((i + 1) * progress_increment / steps) as u8;
        emit_progress(&app, "installing", progress.min(85), "Installing Voquill...");
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for installer: {}", e))?;

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
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "Could not find LOCALAPPDATA")?;

    let app_path = PathBuf::from(local_app_data)
        .join("Voquill")
        .join("Voquill.exe");

    if app_path.exists() {
        return Ok(app_path);
    }

    let program_files = std::env::var("PROGRAMFILES")
        .map_err(|_| "Could not find PROGRAMFILES")?;

    let app_path = PathBuf::from(program_files)
        .join("Voquill")
        .join("Voquill.exe");

    if app_path.exists() {
        return Ok(app_path);
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
