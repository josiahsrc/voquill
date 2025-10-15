#[cfg(desktop)]
pub fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let icon = app.default_window_icon().cloned();

    let open_item = MenuItem::with_id(app, "atari-open", "Open Atari", true, None::<&str>)?;
    let placeholder_item =
        MenuItem::with_id(app, "atari-placeholder", "More Options", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .item(&placeholder_item)
        .build()?;

    let mut tray_builder = TrayIconBuilder::new().menu(&menu).tooltip("Atari");

    if let Some(icon) = icon {
        #[cfg(target_os = "macos")]
        {
            tray_builder = tray_builder.icon(icon).icon_as_template(true);
        }
        #[cfg(not(target_os = "macos"))]
        {
            tray_builder = tray_builder.icon(icon);
        }
    }

    let _tray_icon = tray_builder.build(app)?;

    Ok(())
}
