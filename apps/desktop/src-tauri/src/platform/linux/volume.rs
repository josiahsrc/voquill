pub fn get_system_volume() -> Result<f64, String> {
    // Try pactl first (PulseAudio/PipeWire), fall back to amixer
    if let Ok(output) = std::process::Command::new("pactl")
        .args(["get-sink-volume", "@DEFAULT_SINK@"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Parse "Volume: front-left: 65536 / 100% / ..."
        if let Some(pct) = stdout.split('%').next().and_then(|s| s.rsplit(' ').next()) {
            if let Ok(val) = pct.trim().parse::<f64>() {
                return Ok(val / 100.0);
            }
        }
    }

    let output = std::process::Command::new("amixer")
        .args(["get", "Master"])
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse "[75%]" from amixer output
    for part in stdout.split('[') {
        if let Some(pct_str) = part.strip_suffix("%]") {
            if let Ok(val) = pct_str.parse::<f64>() {
                return Ok(val / 100.0);
            }
        }
    }

    Err("Could not parse system volume".to_string())
}

pub fn set_system_volume(volume: f64) -> Result<(), String> {
    let percent = (volume * 100.0).round() as i32;
    // Try pactl first, fall back to amixer
    if std::process::Command::new("pactl")
        .args(["set-sink-volume", "@DEFAULT_SINK@", &format!("{percent}%")])
        .output()
        .is_ok()
    {
        return Ok(());
    }

    std::process::Command::new("amixer")
        .args(["set", "Master", &format!("{percent}%")])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}
