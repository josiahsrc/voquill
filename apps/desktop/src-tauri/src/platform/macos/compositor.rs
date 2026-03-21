use crate::domain::CompositorBinding;
use tauri::AppHandle;

pub fn deploy_trigger_script(_app: &AppHandle) {}

pub fn sync_compositor_hotkeys(
    _app: &AppHandle,
    _bindings: &[CompositorBinding],
) -> Result<(), String> {
    Ok(())
}
