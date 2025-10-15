use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
};

#[cfg(target_os = "macos")]
const MODEL_URL_ENV: &str = "VOQUILL_WHISPER_MODEL_URL";

#[cfg(target_os = "macos")]
const DEFAULT_WHISPER_MODEL_URL: Option<&str> =
    Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin");

#[cfg(target_os = "macos")]
pub fn ensure_whisper_model(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let model_path = crate::system::paths::whisper_model_path(app)?;

    if model_path.exists() {
        return Ok(model_path);
    }

    let url = resolve_model_url()?;
    download_model(&url, &model_path)?;
    Ok(model_path)
}

#[cfg(target_os = "macos")]
fn resolve_model_url() -> io::Result<String> {
    if let Ok(value) = std::env::var(MODEL_URL_ENV) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    if let Some(value) = DEFAULT_WHISPER_MODEL_URL {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    Err(io::Error::new(
        io::ErrorKind::NotFound,
        format!("Whisper model download URL not configured. Set {MODEL_URL_ENV} or update DEFAULT_WHISPER_MODEL_URL."),
    ))
}

#[cfg(target_os = "macos")]
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
