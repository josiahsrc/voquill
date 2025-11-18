const TRAY_ICON_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/menu-item-36.png"
));

use crate::domain::EVT_REGISTER_CURRENT_APP;

#[cfg(desktop)]
pub fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::image::Image;
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;
    use tauri::{Emitter, Manager};

    let open_item = MenuItem::with_id(app, "open-dashboard", "Open Dashboard", true, None::<&str>)?;
    let register_current_app_item =
        MenuItem::with_id(app, "register-current-app", "Register this app", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit-voquill", "Quit Voquill", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .item(&register_current_app_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let tray_icon_image = Image::from_bytes(TRAY_ICON_BYTES)?;

    #[allow(unused_mut)]
    let mut tray_builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Voquill")
        .icon(tray_icon_image)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-dashboard" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = crate::platform::window::surface_main_window(&window);
                }
            }
            "register-current-app" => {
                if let Err(err) = app.emit(EVT_REGISTER_CURRENT_APP, ()) {
                    eprintln!("Failed to emit register-current-app event: {err}");
                }
            }
            "quit-voquill" => app.exit(0),
            _ => {}
        });

    #[cfg(target_os = "macos")]
    {
        tray_builder = tray_builder.icon_as_template(true);
    }

    let _tray_icon = tray_builder.build(app)?;

    Ok(())
}
