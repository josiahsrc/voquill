use std::{fs, path::PathBuf};

use serde::Deserialize;
use tauri::Manager;

const CONFIG_FILENAME: &str = "voquill.config.json";

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VoquillConfig {
    pub opening_url: Option<String>,
}

pub fn config_path(app: &tauri::AppHandle) -> std::io::Result<PathBuf> {
    let mut path = app
        .path()
        .app_config_dir()
        .map_err(|err| std::io::Error::other(err.to_string()))?;
    path.push(CONFIG_FILENAME);
    Ok(path)
}

pub fn load(app: &tauri::AppHandle) -> VoquillConfig {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(err) => {
            log::warn!("Failed to resolve voquill.config.json path: {err}");
            return VoquillConfig::default();
        }
    };

    if !path.exists() {
        return VoquillConfig::default();
    }

    let contents = match fs::read_to_string(&path) {
        Ok(contents) => contents,
        Err(err) => {
            log::error!("Failed to read {}: {err}", path.display());
            return VoquillConfig::default();
        }
    };

    match serde_json::from_str::<VoquillConfig>(&contents) {
        Ok(config) => config,
        Err(err) => {
            log::error!("Failed to parse {}: {err}", path.display());
            VoquillConfig::default()
        }
    }
}
