use std::collections::HashMap;
use std::fs;

/// Parse /proc/asound/cards to build a map of ALSA card IDs to friendly names.
/// Format of /proc/asound/cards:
///  0 [PCH            ]: HDA-Intel - HDA Intel PCH
///                       HDA Intel PCH at 0xf7f30000 irq 131
///  1 [Audio          ]: USB-Audio - USB Audio
///                       Generic USB Audio at usb-0000:00:14.0-2, full speed
///
/// Returns a map like: {"PCH" => "HDA Intel PCH", "Audio" => "USB Audio"}
fn parse_alsa_cards() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let contents = match fs::read_to_string("/proc/asound/cards") {
        Ok(contents) => contents,
        Err(err) => {
            eprintln!("[audio] failed to read /proc/asound/cards: {err}");
            return map;
        }
    };

    for line in contents.lines() {
        // Look for lines like: " 0 [PCH            ]: HDA-Intel - HDA Intel PCH"
        let trimmed = line.trim_start();

        // Skip empty lines and description lines (they start with whitespace or are continuations)
        if trimmed.is_empty() || !trimmed.chars().next().unwrap_or(' ').is_ascii_digit() {
            continue;
        }

        // Parse the format: "NUMBER [CARD_ID]: DRIVER - FRIENDLY_NAME"
        if let Some(bracket_start) = line.find('[') {
            if let Some(bracket_end) = line.find(']') {
                if let Some(dash_pos) = line.find(" - ") {
                    let card_id = line[bracket_start + 1..bracket_end].trim().to_string();
                    let friendly_name = line[dash_pos + 3..].trim().to_string();

                    if !card_id.is_empty() && !friendly_name.is_empty() {
                        map.insert(card_id, friendly_name);
                    }
                }
            }
        }
    }

    map
}

/// Extract the ALSA card ID from a device name string.
/// Handles various ALSA device formats:
///   - "hw:CARD=Audio,DEV=0" -> Some("Audio")
///   - "plughw:Audio,0" -> Some("Audio")
///   - "sysdefault:CARD=J710" -> Some("J710")
///   - "front:CARD=PCH" -> Some("PCH")
///   - etc.
fn extract_alsa_card_id(device_name: &str) -> Option<String> {
    // Handle CARD= format (hw:CARD=X, sysdefault:CARD=X, front:CARD=X, etc.)
    if let Some(card_start) = device_name.find("CARD=") {
        let after_card = &device_name[card_start + 5..];
        let card_id = if let Some(comma_pos) = after_card.find(',') {
            &after_card[..comma_pos]
        } else {
            after_card
        };
        return Some(card_id.trim().to_string());
    }

    // Handle plughw:CardID,DeviceNum format
    if let Some(colon_pos) = device_name.find(':') {
        let after_colon = &device_name[colon_pos + 1..];
        let card_id = if let Some(comma_pos) = after_colon.find(',') {
            &after_colon[..comma_pos]
        } else {
            after_colon
        };
        // Only return if it's not empty and doesn't start with CARD=
        if !card_id.is_empty() && !card_id.starts_with("CARD=") {
            return Some(card_id.trim().to_string());
        }
    }

    None
}

/// Convert a Linux audio device name to a friendly name.
/// Examples:
///   "hw:CARD=Audio,DEV=0" -> "USB Audio"
///   "sysdefault:CARD=J710" -> "Jabra Speak 710"
///   "pulse" -> "PulseAudio"
///   "pipewire" -> "PipeWire"
///   "default" -> "Default"
pub fn get_friendly_device_name(device_name: &str) -> String {
    // Handle special PulseAudio/PipeWire device names
    if device_name.eq_ignore_ascii_case("pulse") {
        return "PulseAudio".to_string();
    }
    if device_name.eq_ignore_ascii_case("pipewire") {
        return "PipeWire".to_string();
    }
    if device_name.eq_ignore_ascii_case("default") {
        return "Default".to_string();
    }

    // Try to extract the ALSA card ID from various formats
    if let Some(card_id) = extract_alsa_card_id(device_name) {
        let card_map = parse_alsa_cards();
        if let Some(friendly_name) = card_map.get(&card_id) {
            // Check if there's a device number to append
            if device_name.contains("DEV=") {
                if let Some(dev_start) = device_name.find("DEV=") {
                    let after_dev = &device_name[dev_start + 4..];
                    let dev_num = after_dev.split(',').next().unwrap_or("0");
                    if dev_num != "0" {
                        return format!("{} (Device {})", friendly_name, dev_num);
                    }
                }
            } else if device_name.contains(',') {
                // Handle plughw:CardID,DeviceNum format
                if let Some(comma_pos) = device_name.find(',') {
                    let after_comma = &device_name[comma_pos + 1..];
                    if let Ok(dev_num) = after_comma.trim().parse::<u32>() {
                        if dev_num != 0 {
                            return format!("{} (Device {})", friendly_name, dev_num);
                        }
                    }
                }
            }
            return friendly_name.clone();
        }
    }

    // If we can't parse it, return the original name
    device_name.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_special_device_names() {
        assert_eq!(get_friendly_device_name("pulse"), "PulseAudio");
        assert_eq!(get_friendly_device_name("pipewire"), "PipeWire");
        assert_eq!(get_friendly_device_name("default"), "Default");
    }

    #[test]
    fn test_extract_alsa_card_id() {
        // Test CARD= format
        assert_eq!(
            extract_alsa_card_id("hw:CARD=Audio,DEV=0"),
            Some("Audio".to_string())
        );
        assert_eq!(
            extract_alsa_card_id("sysdefault:CARD=J710"),
            Some("J710".to_string())
        );
        assert_eq!(
            extract_alsa_card_id("front:CARD=PCH"),
            Some("PCH".to_string())
        );

        // Test plughw:CardID format
        assert_eq!(
            extract_alsa_card_id("plughw:Audio,0"),
            Some("Audio".to_string())
        );
        assert_eq!(
            extract_alsa_card_id("plughw:J710"),
            Some("J710".to_string())
        );

        // Test invalid formats
        assert_eq!(extract_alsa_card_id("pulse"), None);
        assert_eq!(extract_alsa_card_id("default"), None);
    }

    #[test]
    fn test_parse_alsa_cards() {
        // This test will only pass on systems with /proc/asound/cards
        // On other systems, it should return an empty map without crashing
        let map = parse_alsa_cards();
        // We can't assert specific values since it depends on the system
        // Just ensure it doesn't panic
        println!("Found {} ALSA cards", map.len());
    }
}
