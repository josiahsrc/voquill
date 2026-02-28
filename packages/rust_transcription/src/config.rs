use std::net::IpAddr;
use std::path::PathBuf;

use crate::compute::ComputeMode;

#[derive(Debug, Clone)]
pub struct SidecarConfig {
    pub mode: ComputeMode,
    pub host: IpAddr,
    pub port: u16,
    pub models_dir: PathBuf,
}

impl SidecarConfig {
    pub fn from_env(mode: ComputeMode) -> Result<Self, String> {
        let host = std::env::var("RUST_TRANSCRIPTION_HOST")
            .ok()
            .and_then(|value| value.parse::<IpAddr>().ok())
            .unwrap_or_else(|| "127.0.0.1".parse().expect("static host is valid"));

        let port = std::env::var("RUST_TRANSCRIPTION_PORT")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or_else(|| mode.default_port());

        let models_dir = std::env::var("RUST_TRANSCRIPTION_MODELS_DIR")
            .ok()
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                std::env::current_dir()
                    .unwrap_or_else(|_| PathBuf::from("."))
                    .join("models")
            });

        if let Some(parent) = models_dir.parent() {
            if parent.as_os_str().is_empty() {
                return Err("RUST_TRANSCRIPTION_MODELS_DIR is not a valid path".to_string());
            }
        }

        Ok(Self {
            mode,
            host,
            port,
            models_dir,
        })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
