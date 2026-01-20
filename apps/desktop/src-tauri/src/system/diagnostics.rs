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
    log_content.push_str(&format!("=== Voquill Startup Diagnostics ===\n"));
    log_content.push_str(&format!("Timestamp: {}\n", timestamp));
    log_content.push_str(&format!("Version: {}\n", env!("CARGO_PKG_VERSION")));
    log_content.push_str(&format!("OS: {}\n", std::env::consts::OS));
    log_content.push_str(&format!("Arch: {}\n", std::env::consts::ARCH));
    log_content.push_str(&format!("Family: {}\n", std::env::consts::FAMILY));
    log_content.push_str("\n");

    // Environment variables related to GPU
    log_content.push_str("=== Environment Variables ===\n");
    if let Ok(val) = std::env::var("VOQUILL_WHISPER_DISABLE_GPU") {
        log_content.push_str(&format!("VOQUILL_WHISPER_DISABLE_GPU: {}\n", val));
    } else {
        log_content.push_str("VOQUILL_WHISPER_DISABLE_GPU: <not set>\n");
    }
    log_content.push_str("\n");

    // GPU Information
    log_content.push_str("=== GPU Detection ===\n");
    log_content.push_str("\n");

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

// fn get_vendor_name(vendor_id: u32) -> &'static str {
//     match vendor_id {
//         0x1002 => "AMD",
//         0x8086 => "Intel",
//         0x10DE => "NVIDIA",
//         0x1414 => "Microsoft",
//         0x5143 => "Qualcomm",
//         0x13B5 => "ARM",
//         _ => "Unknown",
//     }
// }
