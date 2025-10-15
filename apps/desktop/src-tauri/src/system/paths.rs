use std::{fs, io, path::PathBuf};
use tauri::Manager;

const MODELS_DIR_NAME: &str = "models";
pub const WHISPER_MODEL_FILENAME: &str = "ggml-base.en.bin";

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
    let mut path = models_dir(app)?;
    path.push(WHISPER_MODEL_FILENAME);
    Ok(path)
}

pub fn models_dir(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|err| io::Error::new(io::ErrorKind::Other, err.to_string()))?;
    path.push(MODELS_DIR_NAME);
    fs::create_dir_all(&path)?;
    Ok(path)
}
