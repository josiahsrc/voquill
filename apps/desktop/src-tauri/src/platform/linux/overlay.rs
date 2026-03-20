pub fn should_use_native_overlays() -> bool {
    super::detect::is_wayland()
}

pub fn try_create_native_overlays(app: &tauri::AppHandle) -> bool {
    if !super::detect::is_wayland() {
        return false;
    }

    if super::wl::overlay::create_pill_overlay(app) {
        super::wl::overlay::start_pill_overlay_loop(app.clone());
        log::info!("Using native Wayland overlays via gtk-layer-shell (pill only, toast not yet supported)");
        true
    } else {
        log::warn!("gtk-layer-shell not supported, falling back to Tauri overlays");
        false
    }
}
