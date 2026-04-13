use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::Env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credentials {
    pub id_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    pub uid: String,
    pub email: Option<String>,
}

pub fn config_dir() -> Result<PathBuf> {
    let base = dirs::config_dir().context("Could not resolve config directory")?;
    Ok(base.join("voquill"))
}

pub fn credentials_path(env: Env) -> Result<PathBuf> {
    Ok(config_dir()?.join(format!("{}.json", env.as_str())))
}

pub fn save(env: Env, credentials: &Credentials) -> Result<PathBuf> {
    let dir = config_dir()?;
    std::fs::create_dir_all(&dir).with_context(|| format!("Failed to create {}", dir.display()))?;

    let path = credentials_path(env)?;
    let json = serde_json::to_vec_pretty(credentials)?;
    std::fs::write(&path, json).with_context(|| format!("Failed to write {}", path.display()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path)?.permissions();
        perms.set_mode(0o600);
        std::fs::set_permissions(&path, perms)?;
    }

    Ok(path)
}

pub fn load(env: Env) -> Result<Option<Credentials>> {
    let path = credentials_path(env)?;
    match std::fs::read(&path) {
        Ok(bytes) => {
            let credentials: Credentials = serde_json::from_slice(&bytes)
                .with_context(|| format!("Failed to parse {}", path.display()))?;
            Ok(Some(credentials))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err).with_context(|| format!("Failed to read {}", path.display())),
    }
}
