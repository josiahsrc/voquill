use anyhow::{Context, Result, bail};
use std::process::Command;

use crate::Env;

pub fn run(env: Env) -> Result<()> {
    let dev = match env {
        Env::Prod => false,
        Env::Dev => true,
        Env::Emulator => bail!("`upgrade` is not supported for the emulator build"),
    };

    if cfg!(windows) {
        run_windows(dev)
    } else {
        run_unix(dev)
    }
}

fn run_unix(dev: bool) -> Result<()> {
    let script = if dev {
        "curl -fsSL https://voquill.com/install.sh | sh -s -- --dev"
    } else {
        "curl -fsSL https://voquill.com/install.sh | sh"
    };

    let status = Command::new("sh")
        .arg("-c")
        .arg(script)
        .status()
        .context("Failed to launch sh to run install script")?;

    if !status.success() {
        bail!("install script exited with status {status}");
    }
    Ok(())
}

fn run_windows(dev: bool) -> Result<()> {
    let script = if dev {
        "& ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Dev"
    } else {
        "iwr https://voquill.com/install.ps1 -UseBasicParsing | iex"
    };

    let status = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
        .status()
        .context("Failed to launch powershell to run install script")?;

    if !status.success() {
        bail!("install script exited with status {status}");
    }
    Ok(())
}
