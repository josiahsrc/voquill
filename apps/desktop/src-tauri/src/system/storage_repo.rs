use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};

use base64::{engine::general_purpose, Engine as _};
use tauri::AppHandle;

use crate::system::paths::storage_dir;

/// Simple local storage repository for buffering data before hooking to a remote backend.
pub struct StorageRepo {
    base_dir: PathBuf,
}

impl StorageRepo {
    /// Initializes the repo rooted in the application's local storage directory.
    pub fn new(app: &AppHandle) -> io::Result<Self> {
        let base_dir = storage_dir(app)?;
        Ok(Self { base_dir })
    }

    fn resolve_relative_path(&self, relative_path: &str) -> io::Result<PathBuf> {
        if relative_path.is_empty() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Storage path cannot be empty",
            ));
        }

        let relative = Path::new(relative_path);
        if relative.is_absolute() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Absolute paths are not allowed in storage",
            ));
        }

        let mut normalized = PathBuf::new();
        for component in relative.components() {
            match component {
                Component::Normal(segment) => normalized.push(segment),
                Component::CurDir => {}
                Component::ParentDir => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "Storage paths must not traverse outside the storage root",
                    ));
                }
                Component::Prefix(_) | Component::RootDir => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "Storage paths must not contain root or prefix components",
                    ));
                }
            }
        }

        if normalized.components().next().is_none() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Storage path cannot be empty or only '.' components",
            ));
        }

        Ok(self.base_dir.join(normalized))
    }

    /// Uploads raw bytes to the requested storage path, creating parent directories as needed.
    pub fn upload_data(&self, relative_path: &str, data: &[u8]) -> io::Result<()> {
        let target_path = self.resolve_relative_path(relative_path)?;
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(target_path, data)
    }

    /// Reads the stored bytes and returns a data URL that can be used for local download.
    pub fn get_download_url(&self, relative_path: &str) -> io::Result<String> {
        let target_path = self.resolve_relative_path(relative_path)?;
        let bytes = fs::read(target_path)?;
        let encoded = general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:application/octet-stream;base64,{encoded}"))
    }
}
