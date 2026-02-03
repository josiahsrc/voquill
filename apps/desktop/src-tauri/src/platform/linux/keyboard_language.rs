pub fn get_keyboard_language() -> Result<String, String> {
    let output = std::process::Command::new("setxkbmap")
        .arg("-query")
        .output()
        .map_err(|err| format!("Failed to run setxkbmap: {err}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if let Some(rest) = line.strip_prefix("layout:") {
            let layout = rest.trim().split(',').next().unwrap_or("us").trim();
            let lang = match layout {
                "us" | "gb" => "en",
                "fr" => "fr",
                "de" => "de",
                "es" => "es",
                "it" => "it",
                "pt" => "pt",
                "ru" => "ru",
                "jp" => "ja",
                "cn" => "zh",
                "kr" => "ko",
                "tr" => "tr",
                "pl" => "pl",
                "nl" => "nl",
                "ara" => "ar",
                "se" => "sv",
                "fi" => "fi",
                "cz" => "cs",
                "ro" => "ro",
                "dk" => "da",
                "hu" => "hu",
                "no" => "no",
                "th" => "th",
                "hr" => "hr",
                "bg" => "bg",
                "sk" => "sk",
                "il" => "he",
                "ua" => "uk",
                "gr" => "el",
                other => other,
            };
            return Ok(lang.to_string());
        }
    }

    Ok("en".to_string())
}
