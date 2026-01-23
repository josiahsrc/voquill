use sqlx::sqlite::SqlitePoolOptions;
use tauri::{Manager, WindowEvent};

const AUTOSTART_HIDDEN_ARG: &str = "--voquill-autostart-hidden";

pub fn build() -> tauri::Builder<tauri::Wry> {
    let updater_builder = tauri_plugin_updater::Builder::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, bring the existing window to the foreground
            if let Some(window) = app.get_webview_window("main") {
                let _ = crate::platform::window::surface_main_window(&window);
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_HIDDEN_ARG.into()]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(crate::db::DB_CONNECTION, crate::db::migrations())
                .build(),
        )
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if window.label() == "main" {
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    {
                        if let Err(err) = crate::platform::macos::dock::hide_dock_icon() {
                            eprintln!("Failed to hide dock icon: {err}");
                        }
                    }
                }
            }
        })
        .setup(|app| {
            eprintln!("[app] Starting application setup...");

            // Write startup diagnostics for debugging
            crate::system::diagnostics::write_startup_diagnostics(app.handle());

            let db_url = {
                let handle = app.handle();
                crate::system::paths::database_url(&handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?
            };

            let pool = tauri::async_runtime::block_on(async {
                SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
            })
            .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

            app.manage(crate::state::OptionKeyDatabase::new(pool.clone()));
            app.manage(crate::state::GoogleOAuthState::from_env());

            #[cfg(desktop)]
            {
                if std::env::args().any(|arg| arg == AUTOSTART_HIDDEN_ARG) {
                    if let Some(main_window) = app.get_webview_window("main") {
                        let _ = main_window.hide();
                        #[cfg(target_os = "macos")]
                        {
                            if let Err(err) = crate::platform::macos::dock::hide_dock_icon() {
                                eprintln!("Failed to hide dock icon on autostart: {err}");
                            }
                        }
                    }
                }

                crate::system::tray::setup_tray(app)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                let app_handle = app.handle();

                use crate::platform::Recorder;
                use std::sync::Arc;

                let transcriber_state = crate::state::TranscriberState::new();

                let recorder: Arc<dyn Recorder> =
                    Arc::new(crate::platform::audio::RecordingManager::new());

                app.manage(recorder);
                app.manage(transcriber_state);

                let pool_for_bg = pool.clone();
                let app_handle_for_bg = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let transcription_mode =
                        crate::db::preferences_queries::fetch_transcription_mode(pool_for_bg)
                            .await
                            .ok()
                            .flatten();

                    let should_init_whisper = match transcription_mode.as_deref() {
                        None | Some("local") => true,
                        _ => false,
                    };

                    if should_init_whisper {
                        eprintln!("[app] Transcription mode is local or unset, initializing Whisper in background...");
                        if let Err(err) =
                            initialize_transcriber_background(&app_handle_for_bg).await
                        {
                            eprintln!("[app] Background Whisper initialization failed: {err}");
                        }
                    } else {
                        eprintln!(
                            "[app] Transcription mode is '{}', skipping Whisper initialization",
                            transcription_mode.as_deref().unwrap_or("unknown")
                        );
                    }
                });

                // Pre-warm audio output for instant chime playback
                crate::system::audio_feedback::warm_audio_output();

                // ensure_unified_overlay_window(&app_handle)
                //     .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                ensure_simple_overlay_window(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                if let Some(simple_window) = app_handle.get_webview_window("simple-overlay") {
                    let _ = crate::platform::window::show_overlay_no_focus(&simple_window);
                }

                start_cursor_follower(app_handle.clone());
            }

            // Open dev tools if VOQUILL_ENABLE_DEVTOOLS is set
            if std::env::var("VOQUILL_ENABLE_DEVTOOLS").is_ok() {
                eprintln!("[app] VOQUILL_ENABLE_DEVTOOLS detected, opening dev tools...");
                if let Some(main_window) = app.get_webview_window("main") {
                    main_window.open_devtools();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::user_get_one,
            crate::commands::user_set_one,
            crate::commands::user_preferences_get,
            crate::commands::start_google_sign_in,
            crate::commands::user_preferences_set,
            crate::commands::list_microphones,
            crate::commands::list_gpus,
            crate::commands::get_screen_visible_area,
            crate::commands::get_monitor_at_cursor,
            crate::commands::check_microphone_permission,
            crate::commands::request_microphone_permission,
            crate::commands::check_accessibility_permission,
            crate::commands::request_accessibility_permission,
            crate::commands::get_current_app_info,
            crate::commands::app_target_upsert,
            crate::commands::app_target_list,
            crate::commands::start_recording,
            crate::commands::stop_recording,
            crate::commands::store_transcription_audio,
            crate::commands::storage_upload_data,
            crate::commands::storage_get_download_url,
            crate::commands::transcribe_audio,
            crate::commands::surface_main_window,
            crate::commands::show_overlay_no_focus,
            crate::commands::set_overlay_click_through,
            crate::commands::restore_overlay_focus,
            crate::commands::show_simple_overlay,
            crate::commands::paste,
            crate::commands::transcription_create,
            crate::commands::transcription_list,
            crate::commands::transcription_delete,
            crate::commands::transcription_update,
            crate::commands::transcription_audio_load,
            crate::commands::purge_stale_transcription_audio,
            crate::commands::term_create,
            crate::commands::term_update,
            crate::commands::term_list,
            crate::commands::term_delete,
            crate::commands::hotkey_list,
            crate::commands::hotkey_save,
            crate::commands::hotkey_delete,
            crate::commands::set_tray_title,
            crate::commands::api_key_create,
            crate::commands::api_key_list,
            crate::commands::api_key_delete,
            crate::commands::api_key_update,
            crate::commands::tone_upsert,
            crate::commands::tone_list,
            crate::commands::tone_get,
            crate::commands::tone_delete,
            crate::commands::clear_local_data,
            crate::commands::set_phase,
            crate::commands::start_key_listener,
            crate::commands::stop_key_listener,
            crate::commands::play_audio,
            crate::commands::get_text_field_info,
            crate::commands::get_screen_context,
            crate::commands::get_selected_text,
            crate::commands::initialize_local_transcriber,
        ])
}

fn ensure_unified_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::{Manager, WebviewWindowBuilder};

    if app.get_webview_window("unified-overlay").is_some() {
        return Ok(());
    }

    let (width, height) = if let Some(monitor) = app.primary_monitor().ok().flatten() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        (size.width as f64 / scale, size.height as f64 / scale)
    } else {
        (1920.0, 1080.0)
    };

    let builder = {
        let builder =
            WebviewWindowBuilder::new(app, "unified-overlay", unified_overlay_webview_url(app)?)
                .decorations(false)
                .always_on_top(true)
                .transparent(true)
                .skip_taskbar(true)
                .resizable(false)
                .shadow(false)
                .focusable(false)
                .inner_size(width, height)
                .position(0.0, 0.0);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure overlay as non-activating: {err}");
    }

    Ok(())
}

fn unified_overlay_webview_url(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewUrl> {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = app.config().build.dev_url.clone() {
            let query = match dev_url.query() {
                Some(existing) if !existing.is_empty() => format!("{existing}&overlay=1"),
                _ => "overlay=1".to_string(),
            };
            dev_url.set_query(Some(&query));
            return Ok(tauri::WebviewUrl::External(dev_url));
        }
    }

    Ok(tauri::WebviewUrl::App("index.html?overlay=1".into()))
}

pub fn ensure_simple_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::{Manager, WebviewWindowBuilder};

    if app.get_webview_window("simple-overlay").is_some() {
        return Ok(());
    }

    let width = 400.0;
    let height = 200.0;

    let (screen_width, screen_height) = if let Some(monitor) = app.primary_monitor().ok().flatten()
    {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        (size.width as f64 / scale, size.height as f64 / scale)
    } else {
        (1920.0, 1080.0)
    };

    let x = (screen_width - width) / 2.0;
    let y = screen_height * 0.75;

    let builder = {
        let builder = WebviewWindowBuilder::new(
            app,
            "simple-overlay",
            simple_overlay_webview_url(app)?,
        )
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focusable(false)
        .inner_size(width, height)
        .position(x, y);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure simple overlay as non-activating: {err}");
    }

    Ok(())
}

fn simple_overlay_webview_url(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewUrl> {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = app.config().build.dev_url.clone() {
            let query = match dev_url.query() {
                Some(existing) if !existing.is_empty() => format!("{existing}&simple-overlay=1"),
                _ => "simple-overlay=1".to_string(),
            };
            dev_url.set_query(Some(&query));
            return Ok(tauri::WebviewUrl::External(dev_url));
        }
    }

    Ok(tauri::WebviewUrl::App("index.html?simple-overlay=1".into()))
}

fn start_cursor_follower(app: tauri::AppHandle) {
    use std::sync::atomic::{AtomicI64, Ordering};
    use std::sync::Arc;
    use std::time::Duration;

    let last_monitor_x = Arc::new(AtomicI64::new(i64::MIN));
    let last_monitor_y = Arc::new(AtomicI64::new(i64::MIN));

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(100));

            let Some(monitor) = crate::platform::monitor::get_monitor_at_cursor() else {
                continue;
            };

            let monitor_x = monitor.x as i64;
            let monitor_y = monitor.y as i64;

            let prev_x = last_monitor_x.load(Ordering::Relaxed);
            let prev_y = last_monitor_y.load(Ordering::Relaxed);

            if monitor_x == prev_x && monitor_y == prev_y {
                continue;
            }

            last_monitor_x.store(monitor_x, Ordering::Relaxed);
            last_monitor_y.store(monitor_y, Ordering::Relaxed);

            let Some(window) = app.get_webview_window("simple-overlay") else {
                continue;
            };

            let width = 400.0;
            let x = monitor.visible_x + (monitor.visible_width - width) / 2.0;
            let y = monitor.height - 200.0;

            let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
                x, y,
            )));
        }
    });
}

async fn initialize_transcriber_background(app: &tauri::AppHandle) -> Result<(), String> {
    use std::sync::Arc;
    use tauri::Manager;

    let transcriber_state = app.state::<crate::state::TranscriberState>();
    if transcriber_state.is_initialized() {
        return Ok(());
    }

    let default_model_size = crate::system::models::WhisperModelSize::default();
    let app_clone = app.clone();
    let model_path = tauri::async_runtime::spawn_blocking(move || {
        crate::system::models::ensure_whisper_model(&app_clone, default_model_size)
            .map_err(|err| err.to_string())
    })
    .await
    .map_err(|err| err.to_string())??;

    let new_transcriber: Arc<dyn crate::platform::Transcriber> = Arc::new(
        crate::platform::whisper::WhisperTranscriber::new(&model_path)
            .map_err(|err| format!("Failed to initialize Whisper transcriber: {err}"))?,
    );

    let _ = transcriber_state.initialize(new_transcriber);
    eprintln!("[app] Background Whisper initialization completed successfully");

    Ok(())
}
