pub fn get_system_volume() -> Result<f64, String> {
    let output = std::process::Command::new("osascript")
        .args(["-e", "output volume of (get volume settings)"])
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let volume: f64 = stdout
        .trim()
        .parse()
        .map_err(|e: std::num::ParseFloatError| e.to_string())?;
    Ok(volume / 100.0)
}

pub fn set_system_volume(volume: f64) -> Result<(), String> {
    let percent = (volume * 100.0).round() as i32;
    std::process::Command::new("osascript")
        .args(["-e", &format!("set volume output volume {percent}")])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}
