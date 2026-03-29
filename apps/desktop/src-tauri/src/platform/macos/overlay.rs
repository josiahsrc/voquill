use crate::domain::{OverlayPhase, PillWindowSize};
use crate::pill_process;

const BINARY_NAME: &str = "voquill-macos-pill";
const PACKAGE_DIR: &str = "rust_macos_pill";

pub fn should_use_native_overlays() -> bool {
    true
}

pub fn try_create_native_overlays(app: &tauri::AppHandle) -> bool {
    let Some(pill_path) = resolve_pill_binary_path(app) else {
        log::warn!("macOS pill binary not found");
        return false;
    };

    if pill_process::try_spawn_pill(app, &pill_path) {
        log::info!("Using native macOS pill overlay");
        true
    } else {
        log::warn!("Native overlay not available, falling back to Tauri overlays");
        false
    }
}

pub fn notify_phase(app: &tauri::AppHandle, phase: &OverlayPhase) {
    pill_process::notify_phase(app, phase);
}

pub fn notify_audio_levels(app: &tauri::AppHandle, levels: &[f32]) {
    pill_process::notify_audio_levels(app, levels);
}

pub fn notify_visibility(app: &tauri::AppHandle, visibility: &str) {
    pill_process::notify_visibility(app, visibility);
}

pub fn notify_style_info(app: &tauri::AppHandle, count: u32, name: &str) {
    pill_process::notify_style_info(app, count, name);
}

pub fn notify_pill_window_size(app: &tauri::AppHandle, size: &PillWindowSize) {
    pill_process::notify_pill_window_size(app, size);
}

pub fn notify_assistant_state(app: &tauri::AppHandle, payload: &str) {
    pill_process::notify_assistant_state(app, payload);
}

fn resolve_pill_binary_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    pill_process::resolve_pill_binary_in_resources(app, BINARY_NAME)
        .or_else(|| pill_process::resolve_pill_binary_in_dev(PACKAGE_DIR, BINARY_NAME))
}
