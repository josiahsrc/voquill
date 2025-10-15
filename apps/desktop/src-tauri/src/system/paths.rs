use std::{fs, io, path::PathBuf};
use tauri::Manager;

pub fn database_path(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut path = app
        .path()
        .app_config_dir()
        .map_err(|err| io::Error::new(io::ErrorKind::Other, err.to_string()))?;
    fs::create_dir_all(&path)?;
    path.push(crate::db::DB_FILENAME);
    Ok(path)
}

pub fn database_url(app: &tauri::AppHandle) -> io::Result<String> {
    let path = database_path(app)?;
    let path_str = path
        .to_str()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "Invalid database path"))?;
    Ok(format!("sqlite:{path_str}"))
}

#[cfg(target_os = "macos")]
pub fn whisper_model_path(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    app.path()
        .resolve(
            "resources/models/ggml-base.en.bin",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|err| io::Error::new(io::ErrorKind::NotFound, err.to_string()))
}
