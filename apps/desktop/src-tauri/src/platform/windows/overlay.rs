pub fn should_use_native_overlays() -> bool {
    false
}

pub fn try_create_native_overlays(_app: &tauri::AppHandle) -> bool {
    false
}

pub fn notify_phase(_app: &tauri::AppHandle, _phase: &crate::domain::OverlayPhase) {}

pub fn notify_audio_levels(_app: &tauri::AppHandle, _levels: &[f32]) {}

pub fn notify_visibility(_app: &tauri::AppHandle, _visibility: &str) {}

pub fn notify_style_info(_app: &tauri::AppHandle, _count: u32, _name: &str) {}

pub fn notify_pill_window_size(
    _app: &tauri::AppHandle,
    _size: &crate::domain::PillWindowSize,
) {
}

pub fn notify_assistant_state(_app: &tauri::AppHandle, _payload: &str) {}
