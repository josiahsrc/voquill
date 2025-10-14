// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(desktop)]
fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let updater_builder = match std::env::var("TAURI_UPDATER_PUBLIC_KEY") {
        Ok(pubkey) if !pubkey.trim().is_empty() => {
            tauri_plugin_updater::Builder::new().pubkey(pubkey)
        }
        _ => tauri_plugin_updater::Builder::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                setup_tray(app).map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
