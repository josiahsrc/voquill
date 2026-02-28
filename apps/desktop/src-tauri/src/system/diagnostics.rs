use std::fs;
use std::io::Write;

/// Write startup diagnostics to a log file for debugging purposes.
/// This is particularly useful for diagnosing crashes on specific hardware configurations.
pub fn write_startup_diagnostics(app: &tauri::AppHandle) {
    let log_path = match crate::system::paths::startup_diagnostics_path(app) {
        Ok(path) => path,
        Err(err) => {
            eprintln!("[diagnostics] ERROR: Failed to get diagnostics log path: {err}");
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
                eprintln!("[diagnostics] ERROR: Failed to write to diagnostics log: {err}");
            } else {
                eprintln!(
                    "[diagnostics] Startup diagnostics written to: {}",
                    log_path.display()
                );
            }
        }
        Err(err) => {
            eprintln!("[diagnostics] ERROR: Failed to open diagnostics log file: {err}");
        }
    }
}
