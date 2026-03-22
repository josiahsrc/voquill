pub fn should_use_native_overlays() -> bool {
    false
}

pub fn try_create_native_overlays(_app: &tauri::AppHandle) -> bool {
    false
}

pub fn notify_phase(_app: &tauri::AppHandle, _phase: &crate::domain::OverlayPhase) {}

pub fn notify_audio_levels(_app: &tauri::AppHandle, _levels: &[f32]) {}
