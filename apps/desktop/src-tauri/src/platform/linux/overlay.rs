pub use super::wl::overlay::PillProcess;

use crate::domain::OverlayPhase;
use tauri::Manager;

pub fn should_use_native_overlays() -> bool {
    super::detect::is_wayland()
}

pub fn try_create_native_overlays(app: &tauri::AppHandle) -> bool {
    if !super::detect::is_wayland() {
        return false;
    }

    if super::wl::overlay::try_create_pill_overlay(app) {
        log::info!("Using native Wayland overlays via GTK4 layer-shell");
        true
    } else {
        log::warn!("Native Wayland overlay not available, falling back to Tauri overlays");
        false
    }
}

pub fn notify_phase(app: &tauri::AppHandle, phase: &OverlayPhase) {
    if let Some(pill) = app.try_state::<std::sync::Arc<PillProcess>>() {
        let phase_str = match phase {
            OverlayPhase::Idle => "idle",
            OverlayPhase::Recording => "recording",
            OverlayPhase::Loading => "loading",
        };
        pill.send(&format!(r#"{{"type":"phase","phase":"{phase_str}"}}"#));
    }
}

pub fn notify_audio_levels(app: &tauri::AppHandle, levels: &[f32]) {
    if let Some(pill) = app.try_state::<std::sync::Arc<PillProcess>>() {
        if let Ok(json) = serde_json::to_string(&serde_json::json!({"type": "levels", "levels": levels})) {
            pill.send(&json);
        }
    }
}
