use std::process::Command;
use std::sync::Mutex;

pub use crate::platform::{NativeSetupResult, NativeSetupStatus};

static YDOTOOLD_CHILD: Mutex<Option<std::process::Child>> = Mutex::new(None);

fn is_ydotool_installed() -> bool {
    Command::new("which")
        .arg("ydotool")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn user_in_input_group() -> bool {
    Command::new("id")
        .arg("-nG")
        .output()
        .map(|out| {
            String::from_utf8_lossy(&out.stdout)
                .split_whitespace()
                .any(|g| g == "input")
        })
        .unwrap_or(false)
}

fn uinput_accessible() -> bool {
    std::fs::OpenOptions::new()
        .write(true)
        .open("/dev/uinput")
        .is_ok()
}

pub fn get_native_setup_status() -> NativeSetupStatus {
    if !is_ydotool_installed() || !uinput_accessible() {
        return NativeSetupStatus::NeedsSetup;
    }
    if !user_in_input_group() {
        return NativeSetupStatus::NeedsRestart;
    }
    NativeSetupStatus::Ready
}

fn is_ydotoold_running() -> bool {
    Command::new("sh")
        .args(["-c", "pgrep -x ydotoold >/dev/null 2>&1"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

pub fn ensure_background_services() {
    if !is_ydotool_installed() || !uinput_accessible() {
        return;
    }
    if is_ydotoold_running() {
        log::info!("ydotoold already running");
        return;
    }

    match Command::new("ydotoold")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(child) => {
            log::info!("Spawned ydotoold (pid {})", child.id());
            let mut guard = YDOTOOLD_CHILD.lock().unwrap_or_else(|p| p.into_inner());
            *guard = Some(child);
        }
        Err(err) => {
            log::error!("Failed to spawn ydotoold: {err}");
        }
    }
}

fn detect_install_command() -> Option<&'static str> {
    let managers = ["apt-get", "dnf", "pacman", "zypper", "apk"];

    for bin in managers {
        let found = Command::new("which")
            .arg(bin)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        if found {
            return Some(bin);
        }
    }
    None
}

fn build_setup_script(username: &str) -> Result<String, String> {
    let pkg_manager = detect_install_command()
        .ok_or_else(|| "No supported package manager found".to_string())?;

    let install_cmd = match pkg_manager {
        "apt-get" => "apt-get install -y ydotool",
        "dnf" => "dnf install -y ydotool",
        "pacman" => "pacman -S --noconfirm ydotool",
        "zypper" => "zypper install -y ydotool",
        "apk" => "apk add ydotool",
        _ => return Err(format!("Unsupported package manager: {pkg_manager}")),
    };

    Ok(format!(
        "{install_cmd} && \
         usermod -aG input {username} && \
         echo 'KERNEL==\"uinput\", GROUP=\"input\", MODE=\"0660\"' > /etc/udev/rules.d/99-voquill-uinput.rules && \
         udevadm control --reload-rules && udevadm trigger /dev/uinput && \
         (systemctl enable --now ydotoold 2>/dev/null || true)"
    ))
}

pub async fn run_native_setup() -> NativeSetupResult {
    let result = tokio::task::spawn_blocking(|| {
        let username = std::env::var("USER")
            .or_else(|_| std::env::var("LOGNAME"))
            .map_err(|_| "Could not determine current username".to_string());

        let username = match username {
            Ok(u) => u,
            Err(err) => {
                log::error!("{err}");
                return NativeSetupResult::Failed;
            }
        };

        let script = match build_setup_script(&username) {
            Ok(s) => s,
            Err(err) => {
                log::error!("Failed to build setup script: {err}");
                return NativeSetupResult::Failed;
            }
        };

        log::info!("Running native setup: pkexec sh -c \"{script}\"");

        let status = Command::new("pkexec")
            .args(["sh", "-c", &script])
            .status();

        match status {
            Ok(s) if s.success() => {
                log::info!("Native setup completed successfully");
                // Try user service as well (doesn't need root)
                let _ = Command::new("systemctl")
                    .args(["--user", "enable", "--now", "ydotoold"])
                    .status();

                if user_in_input_group() {
                    NativeSetupResult::Success
                } else {
                    NativeSetupResult::RequireRestart
                }
            }
            Ok(s) => {
                log::error!("pkexec failed with exit code: {:?}", s.code());
                NativeSetupResult::Failed
            }
            Err(err) => {
                log::error!("Failed to launch pkexec: {err}");
                NativeSetupResult::Failed
            }
        }
    })
    .await
    .unwrap_or(NativeSetupResult::Failed);

    result
}
