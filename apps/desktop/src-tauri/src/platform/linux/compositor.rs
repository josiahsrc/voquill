use crate::domain::CompositorBinding;

pub fn deploy_trigger_script(app: &tauri::AppHandle) {
    if super::detect::is_wayland() {
        super::wl::compositor::deploy_trigger_script(app);
    }
}

pub fn sync_compositor_hotkeys(
    app: &tauri::AppHandle,
    bindings: &[CompositorBinding],
) -> Result<(), String> {
    if super::detect::is_wayland() {
        super::wl::compositor::sync_compositor_hotkeys(app, bindings)
    } else {
        Ok(())
    }
}
