use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;
use tauri::Manager;

use crate::domain::CompositorBinding;

static WTYPE_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
const EMBEDDED_TRIGGER_SCRIPT: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/resources/trigger-hotkey.sh"));

pub fn wtype_path() -> Option<&'static PathBuf> {
    WTYPE_PATH.get().and_then(|p| p.as_ref())
}

enum Compositor {
    Gnome,
    Sway,
    Hyprland,
    Unknown(String),
}

pub fn deploy_trigger_script(app: &tauri::AppHandle) {
    if let Err(err) = deploy_trigger_script_inner(app) {
        log::error!("Failed to deploy trigger script: {err}");
    }
    deploy_wtype(app);
}

fn deploy_trigger_script_inner(app: &tauri::AppHandle) -> Result<(), String> {
    let dest = trigger_script_path(app)?;
    let config_dir = dest.parent().ok_or("Invalid script dest path")?;
    fs::create_dir_all(config_dir)
        .map_err(|err| format!("Failed to create config dir: {err}"))?;

    let resource_path = match app
        .path()
        .resolve("resources/trigger-hotkey.sh", tauri::path::BaseDirectory::Resource)
    {
        Ok(path) => {
            log::info!(
                "Resolved bundled trigger-hotkey.sh to {}",
                path.display()
            );
            Some(path)
        }
        Err(err) => {
            log::warn!(
                "Failed to resolve bundled trigger-hotkey.sh resource path: {err}. Using embedded fallback."
            );
            None
        }
    };

    if let Some(resource_path) = resource_path.as_ref().filter(|path| path.exists()) {
        fs::copy(resource_path, &dest)
            .map_err(|err| format!("Failed to copy trigger script: {err}"))?;
        log::info!(
            "Copied trigger script from {} to {}",
            resource_path.display(),
            dest.display()
        );
    } else {
        if let Some(resource_path) = resource_path.as_ref() {
            log::warn!(
                "Bundled trigger-hotkey.sh not found at {}. Writing embedded fallback to {}.",
                resource_path.display(),
                dest.display()
            );
        } else {
            log::warn!(
                "Bundled trigger-hotkey.sh unavailable. Writing embedded fallback to {}.",
                dest.display()
            );
        }

        fs::write(&dest, EMBEDDED_TRIGGER_SCRIPT)
            .map_err(|err| format!("Failed to write embedded trigger script: {err}"))?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&dest, fs::Permissions::from_mode(0o755))
            .map_err(|err| format!("Failed to set script permissions: {err}"))?;
    }

    log::info!("Deployed trigger script to {}", dest.display());
    Ok(())
}

fn deploy_wtype(_app: &tauri::AppHandle) {
    let resolved = Command::new("which")
        .arg("wtype")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| PathBuf::from(String::from_utf8_lossy(&o.stdout).trim().to_string()))
        .filter(|p| p.exists());

    if let Some(ref path) = resolved {
        log::info!("Found wtype at {}", path.display());
    } else {
        log::warn!("wtype not found in PATH — install it for Sway/Hyprland input simulation");
    }

    let _ = WTYPE_PATH.set(resolved);
}

fn trigger_script_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|err| format!("Failed to get config dir: {err}"))?;
    Ok(config_dir.join("trigger-hotkey.sh"))
}

fn detect_compositor() -> Compositor {
    if let Ok(desktop) = std::env::var("XDG_CURRENT_DESKTOP") {
        let lower = desktop.to_lowercase();
        if lower.contains("gnome") {
            return Compositor::Gnome;
        }
        if lower.contains("sway") {
            return Compositor::Sway;
        }
        if lower.contains("hyprland") {
            return Compositor::Hyprland;
        }
    }

    if let Ok(output) = Command::new("sh")
        .arg("-c")
        .arg("ps -e -o comm= 2>/dev/null")
        .output()
    {
        let procs = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if procs.contains("gnome-shell") || procs.contains("mutter") {
            return Compositor::Gnome;
        }
        if procs.lines().any(|l| l.trim() == "sway") {
            return Compositor::Sway;
        }
        if procs.lines().any(|l| l.trim() == "hyprland") {
            return Compositor::Hyprland;
        }
    }

    Compositor::Unknown(std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default())
}

pub fn sync_compositor_hotkeys(
    app: &tauri::AppHandle,
    bindings: &[CompositorBinding],
) -> Result<(), String> {
    let script_path = trigger_script_path(app)?;
    if !script_path.exists() {
        return Err("Trigger script not deployed yet".into());
    }

    let compositor = detect_compositor();
    match compositor {
        Compositor::Gnome => sync_gnome(&script_path, bindings),
        Compositor::Sway => sync_sway(&script_path, bindings),
        Compositor::Hyprland => sync_hyprland(&script_path, bindings),
        Compositor::Unknown(name) => {
            log::warn!("Unknown compositor '{name}', skipping hotkey sync");
            Ok(())
        }
    }
}

// --- Key translation ---

fn classify_key(key: &str) -> Option<(&'static str, bool)> {
    let lower = key.to_lowercase();
    if lower.starts_with("meta") {
        Some(("super", true))
    } else if lower.starts_with("control") {
        Some(("ctrl", true))
    } else if lower.starts_with("shift") {
        Some(("shift", true))
    } else if lower.starts_with("alt") || lower.starts_with("option") {
        Some(("alt", true))
    } else {
        None
    }
}

fn extract_non_modifier_key(key: &str) -> String {
    let lower = key.to_lowercase();
    if lower.starts_with("key") && key.len() > 3 {
        return key[3..].to_lowercase();
    }
    if lower.starts_with("digit") && key.len() > 5 {
        return key[5..].to_string();
    }
    lower
}

fn keys_to_gnome_binding(keys: &[String]) -> String {
    let mut modifiers = Vec::new();
    let mut non_mod = String::new();

    for key in keys {
        if let Some((name, _)) = classify_key(key) {
            let gnome_mod = match name {
                "super" => "<Super>",
                "ctrl" => "<Ctrl>",
                "shift" => "<Shift>",
                "alt" => "<Alt>",
                _ => continue,
            };
            if !modifiers.contains(&gnome_mod) {
                modifiers.push(gnome_mod);
            }
        } else {
            non_mod = extract_non_modifier_key(key);
        }
    }

    format!("{}{}", modifiers.join(""), non_mod)
}

fn keys_to_sway_binding(keys: &[String]) -> String {
    let mut parts = Vec::new();

    for key in keys {
        if let Some((name, _)) = classify_key(key) {
            let sway_mod = match name {
                "super" => "Mod4",
                "ctrl" => "Control",
                "shift" => "Shift",
                "alt" => "Mod1",
                _ => continue,
            };
            if !parts.contains(&sway_mod.to_string()) {
                parts.push(sway_mod.to_string());
            }
        } else {
            parts.push(extract_non_modifier_key(key));
        }
    }

    parts.join("+")
}

fn keys_to_hyprland_binding(keys: &[String]) -> (String, String) {
    let mut modifiers = Vec::new();
    let mut non_mod = String::new();

    for key in keys {
        if let Some((name, _)) = classify_key(key) {
            let hypr_mod = match name {
                "super" => "SUPER",
                "ctrl" => "CTRL",
                "shift" => "SHIFT",
                "alt" => "ALT",
                _ => continue,
            };
            if !modifiers.contains(&hypr_mod.to_string()) {
                modifiers.push(hypr_mod.to_string());
            }
        } else {
            non_mod = extract_non_modifier_key(key);
        }
    }

    (modifiers.join(" "), non_mod)
}

// --- GNOME ---

const GNOME_KEYBINDING_BASE: &str = "org.gnome.settings-daemon.plugins.media-keys";
const GNOME_CUSTOM_SCHEMA: &str =
    "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";
const GNOME_CUSTOM_PREFIX: &str =
    "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings";
const VOQUILL_KEYBINDING_TAG: &str = "voquill-";

fn read_gsettings_string_list(schema: &str, key: &str) -> Result<Vec<String>, String> {
    let output = Command::new("gsettings")
        .arg("get")
        .arg(schema)
        .arg(key)
        .output()
        .map_err(|err| format!("gsettings get failed: {err}"))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw == "@as []" || raw.is_empty() {
        return Ok(vec![]);
    }

    Ok(raw
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(',')
        .map(|s| s.trim().trim_matches('\'').trim_matches('"').to_string())
        .filter(|s| !s.is_empty())
        .collect())
}

fn write_gsettings_string_list(
    schema: &str,
    key: &str,
    values: &[String],
) -> Result<(), String> {
    let formatted: Vec<String> = values.iter().map(|v| format!("'{v}'")).collect();
    let list = format!("[{}]", formatted.join(", "));

    let status = Command::new("gsettings")
        .arg("set")
        .arg(schema)
        .arg(key)
        .arg(&list)
        .status()
        .map_err(|err| format!("gsettings set failed: {err}"))?;

    if !status.success() {
        return Err("gsettings set returned non-zero".into());
    }
    Ok(())
}

fn gsettings_set_custom_keybinding(
    dconf_path: &str,
    property: &str,
    value: &str,
) -> Result<(), String> {
    let schema_with_path = format!("{GNOME_CUSTOM_SCHEMA}:{dconf_path}");
    let status = Command::new("gsettings")
        .arg("set")
        .arg(&schema_with_path)
        .arg(property)
        .arg(value)
        .status()
        .map_err(|err| format!("gsettings set custom keybinding failed: {err}"))?;

    if !status.success() {
        return Err(format!(
            "gsettings set {property} on {dconf_path} returned non-zero"
        ));
    }
    Ok(())
}

fn sync_gnome(script_path: &Path, bindings: &[CompositorBinding]) -> Result<(), String> {
    let existing_list = read_gsettings_string_list(GNOME_KEYBINDING_BASE, "custom-keybindings")?;

    let user_paths: Vec<String> = existing_list
        .into_iter()
        .filter(|p| !p.contains(VOQUILL_KEYBINDING_TAG))
        .collect();

    let mut new_paths = user_paths;
    for binding in bindings {
        if binding.keys.is_empty() {
            continue;
        }
        let dconf_path = format!(
            "{GNOME_CUSTOM_PREFIX}/{VOQUILL_KEYBINDING_TAG}{}/",
            binding.action_name
        );
        let gnome_binding = keys_to_gnome_binding(&binding.keys);
        let command = format!("{} {}", script_path.display(), binding.action_name);

        gsettings_set_custom_keybinding(&dconf_path, "name", &format!("Voquill {}", binding.action_name))?;
        gsettings_set_custom_keybinding(&dconf_path, "command", &command)?;
        gsettings_set_custom_keybinding(&dconf_path, "binding", &gnome_binding)?;

        if !new_paths.contains(&dconf_path) {
            new_paths.push(dconf_path);
        }
    }

    write_gsettings_string_list(GNOME_KEYBINDING_BASE, "custom-keybindings", &new_paths)?;
    log::info!("Synced {} GNOME compositor hotkeys", bindings.len());
    Ok(())
}

// --- Sway ---

fn sync_sway(script_path: &Path, bindings: &[CompositorBinding]) -> Result<(), String> {
    let config_dir = config_home().join("sway");
    if !config_dir.exists() {
        log::info!("Sway config dir not found, skipping hotkey sync");
        return Ok(());
    }

    let include_path = config_dir.join("voquill-hotkeys");
    let mut content = String::from("# Auto-generated by Voquill. Do not edit.\n");

    for binding in bindings {
        if binding.keys.is_empty() {
            continue;
        }
        let sway_keys = keys_to_sway_binding(&binding.keys);
        content.push_str(&format!(
            "bindsym {} exec {} {}\n",
            sway_keys,
            script_path.display(),
            binding.action_name,
        ));
    }

    fs::write(&include_path, &content)
        .map_err(|err| format!("Failed to write sway hotkeys: {err}"))?;

    let _ = Command::new("swaymsg").arg("reload").output();
    log::info!("Synced {} Sway compositor hotkeys", bindings.len());
    Ok(())
}

// --- Hyprland ---

fn sync_hyprland(script_path: &Path, bindings: &[CompositorBinding]) -> Result<(), String> {
    let config_dir = config_home().join("hypr");
    if !config_dir.exists() {
        log::info!("Hyprland config dir not found, skipping hotkey sync");
        return Ok(());
    }

    let include_path = config_dir.join("voquill-hotkeys.conf");
    let mut content = String::from("# Auto-generated by Voquill. Do not edit.\n");

    for binding in bindings {
        if binding.keys.is_empty() {
            continue;
        }
        let (mods, key) = keys_to_hyprland_binding(&binding.keys);
        content.push_str(&format!(
            "bind = {}, {}, exec, {} {}\n",
            mods,
            key,
            script_path.display(),
            binding.action_name,
        ));
    }

    fs::write(&include_path, &content)
        .map_err(|err| format!("Failed to write hyprland hotkeys: {err}"))?;

    let _ = Command::new("hyprctl").arg("reload").output();
    log::info!("Synced {} Hyprland compositor hotkeys", bindings.len());
    Ok(())
}

fn config_home() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg);
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".config");
    }
    PathBuf::from("/tmp")
}
