#[cfg(target_os = "macos")]
const TRAY_ICON_DEFAULT: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/menu-item-macos-36.png"
));

#[cfg(not(target_os = "macos"))]
const TRAY_ICON_DEFAULT: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/menu-item-win-linux-36.png"
));

#[cfg(target_os = "macos")]
const TRAY_ICON_UPDATE: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/update-macos-36.png"
));

#[cfg(not(target_os = "macos"))]
const TRAY_ICON_UPDATE: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/update-win-linux-36.png"
));

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MenuIconVariant {
    Default,
    Update,
}

use crate::domain::EVT_REGISTER_CURRENT_APP;
use std::sync::OnceLock;
use tauri::menu::MenuItem;

pub const EVT_INSTALL_UPDATE: &str = "tray-install-update";

static UPDATE_MENU_ITEM: OnceLock<MenuItem<tauri::Wry>> = OnceLock::new();

#[cfg(desktop)]
pub fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::image::Image;
    use tauri::menu::MenuBuilder;
    use tauri::tray::TrayIconBuilder;
    use tauri::{Emitter, Manager};

    let open_item = MenuItem::with_id(app, "open-dashboard", "Open Dashboard", true, None::<&str>)?;
    let update_item = MenuItem::with_id(app, "install-update", "Install Update", false, None::<&str>)?;
    let _ = UPDATE_MENU_ITEM.set(update_item.clone());
    let register_current_app_item =
        MenuItem::with_id(app, "register-current-app", "Register this app", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit-voquill", "Quit Voquill", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .item(&register_current_app_item)
        .item(&update_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let tray_icon_image = Image::from_bytes(TRAY_ICON_DEFAULT)?;

    #[allow(unused_mut)]
    let mut tray_builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .tooltip("Voquill")
        .icon(tray_icon_image)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-dashboard" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = crate::platform::window::surface_main_window(&window);
                }
            }
            "install-update" => {
                if let Err(err) = app.emit(EVT_INSTALL_UPDATE, ()) {
                    eprintln!("Failed to emit install-update event: {err}");
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

pub fn set_menu_icon(app: &tauri::AppHandle, variant: MenuIconVariant) -> Result<(), String> {
    use tauri::image::Image;
    use tauri::tray::TrayIconId;

    let is_update = matches!(variant, MenuIconVariant::Update);

    let bytes = match variant {
        MenuIconVariant::Default => TRAY_ICON_DEFAULT,
        MenuIconVariant::Update => TRAY_ICON_UPDATE,
    };

    let tray = app
        .tray_by_id(&TrayIconId::new("main"))
        .ok_or("Tray icon not found")?;

    let image = Image::from_bytes(bytes).map_err(|err| err.to_string())?;
    tray.set_icon(Some(image)).map_err(|err| err.to_string())?;

    if let Some(update_item) = UPDATE_MENU_ITEM.get() {
        let _ = update_item.set_enabled(is_update);
    }

    #[cfg(target_os = "macos")]
    {
        tray.set_icon_as_template(true)
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}
