pub fn try_create_native_overlays(app: &tauri::AppHandle) -> bool {
    crate::platform::overlay::try_create_native_overlays(app)
}
