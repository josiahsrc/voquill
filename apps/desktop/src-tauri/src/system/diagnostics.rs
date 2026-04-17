use std::fs;
use std::io::Write;

pub fn purge_old_logs(app: &tauri::AppHandle) {
    let logs_dir = match crate::system::paths::logs_dir(app) {
        Ok(dir) => dir,
        Err(err) => {
            log::error!("Failed to get logs dir for purge: {err}");
            return;
        }
    };

    let mut files: Vec<(std::path::PathBuf, std::time::SystemTime)> = match fs::read_dir(&logs_dir)
    {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .filter_map(|e| {
                let modified = e.metadata().ok()?.modified().ok()?;
                Some((e.path(), modified))
            })
            .collect(),
        Err(err) => {
            log::error!("Failed to read logs dir for purge: {err}");
            return;
        }
    };

    if files.len() <= 10 {
        return;
    }

    files.sort_by_key(|b| std::cmp::Reverse(b.1));

    for (path, _) in files.iter().skip(10) {
        if let Err(err) = fs::remove_file(path) {
            log::warn!("Failed to purge old log file {}: {err}", path.display());
        }
    }

    log::info!("Purged {} old log files", files.len() - 10);
}

/// Write startup diagnostics to a log file for debugging purposes.
/// This is particularly useful for diagnosing crashes on specific hardware configurations.
pub fn write_startup_diagnostics(app: &tauri::AppHandle) {
    let log_path = match crate::system::paths::startup_diagnostics_path(app) {
        Ok(path) => path,
        Err(err) => {
            log::error!("Failed to get diagnostics log path: {err}");
            return;
        }
    };

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let mut log_content = String::new();
    log_content.push_str("=== Voquill Startup Diagnostics ===\n");
    log_content.push_str(&format!("Timestamp: {}\n", timestamp));
    log_content.push_str(&format!("Version: {}\n", env!("CARGO_PKG_VERSION")));
    log_content.push_str(&format!("OS: {}\n", std::env::consts::OS));
    log_content.push_str(&format!("Arch: {}\n", std::env::consts::ARCH));
    log_content.push_str(&format!("Family: {}\n", std::env::consts::FAMILY));
    log_content.push('\n');

    // GPU Information
    log_content.push_str("=== GPU Detection ===\n");
    log_content.push('\n');

    // System info
    log_content.push_str("=== System Information ===\n");
    if let Ok(hostname) = hostname::get() {
        if let Some(hostname_str) = hostname.to_str() {
            log_content.push_str(&format!("Hostname: {}\n", hostname_str));
        }
    }

    // Write to file
    match fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        Ok(mut file) => {
            if let Err(err) = file.write_all(log_content.as_bytes()) {
                log::error!("Failed to write to diagnostics log: {err}");
            } else {
                log::info!("Startup diagnostics written to: {}", log_path.display());
            }
        }
        Err(err) => {
            log::error!("Failed to open diagnostics log file: {err}");
        }
    }
}
