use std::{
    fmt, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    str::FromStr,
};

const MODEL_URL_ENV: &str = "VOQUILL_WHISPER_MODEL_URL";

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum WhisperModelSize {
    Tiny,
    Base,
    Small,
    Medium,
}

impl WhisperModelSize {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Tiny => "tiny",
            Self::Base => "base",
            Self::Small => "small",
            Self::Medium => "medium",
        }
    }

    pub fn filename(self) -> &'static str {
        match self {
            Self::Tiny => "ggml-tiny.bin",
            Self::Base => "ggml-base.bin",
            Self::Small => "ggml-small.bin",
            Self::Medium => "ggml-medium.bin",
        }
    }

    fn default_url(self) -> Option<&'static str> {
        match self {
            Self::Tiny => {
                Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin")
            }
            Self::Base => {
                Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin")
            }
            Self::Small => {
                Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin")
            }
            Self::Medium => {
                Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin")
            }
        }
    }

    fn env_var_name(self) -> String {
        format!("{}_{}", MODEL_URL_ENV, self.as_str().to_ascii_uppercase())
    }
}

impl Default for WhisperModelSize {
    fn default() -> Self {
        Self::Base
    }
}

impl FromStr for WhisperModelSize {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let normalized = value.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "tiny" => Ok(Self::Tiny),
            "base" => Ok(Self::Base),
            "small" => Ok(Self::Small),
            "medium" => Ok(Self::Medium),
            _ => Err(()),
        }
    }
}

impl fmt::Display for WhisperModelSize {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

pub fn ensure_whisper_model(app: &tauri::AppHandle, size: WhisperModelSize) -> io::Result<PathBuf> {
    let model_path = crate::system::paths::whisper_model_path(app, size)?;

    if model_path.exists() {
        return Ok(model_path);
    }

    let url = resolve_model_url(size)?;
    download_model(&url, &model_path)?;
    Ok(model_path)
}

fn resolve_model_url(size: WhisperModelSize) -> io::Result<String> {
    let specific_env = size.env_var_name();

    if let Ok(value) = std::env::var(&specific_env) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    if size == WhisperModelSize::Base {
        if let Ok(value) = std::env::var(MODEL_URL_ENV) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }

    if let Some(value) = size.default_url() {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    Err(io::Error::new(
        io::ErrorKind::NotFound,
        format!(
            "Whisper model download URL not configured for size '{}'. \
             Set {} or update the default URL mapping.",
            size, specific_env
        ),
    ))
}

fn download_model(url: &str, destination: &Path) -> io::Result<()> {
    let parent = destination
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Invalid model destination path"))?;

    fs::create_dir_all(parent)?;

    let temp_name = format!(
        "{}.download",
        destination
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Invalid model filename"))?
    );

    let temp_path = destination.with_file_name(temp_name);

    // Clean up any previous partial download.
    let _ = fs::remove_file(&temp_path);

    let mut response = reqwest::blocking::get(url).map_err(|err| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("Failed to request whisper model: {err}"),
        )
    })?;

    if !response.status().is_success() {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!(
                "Failed to download whisper model, server returned status: {}",
                response.status()
            ),
        ));
    }

    let mut temp_file = fs::File::create(&temp_path)?;
    io::copy(&mut response, &mut temp_file)?;
    temp_file.flush()?;

    fs::rename(&temp_path, destination)?;

    Ok(())
}
