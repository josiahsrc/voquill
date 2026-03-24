use sqlx::sqlite::SqlitePoolOptions;
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};

const AUTOSTART_HIDDEN_ARG: &str = "--voquill-autostart-hidden";

fn handle_run_event(app_handle: &tauri::AppHandle, event: RunEvent) {
    let _ = (&app_handle, &event);
    #[cfg(target_os = "macos")]
    if let RunEvent::Reopen {
        has_visible_windows,
        ..
    } = event
    {
        if !has_visible_windows {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = crate::platform::window::surface_main_window(&window);
            }
        }
    }
}

pub fn build() -> tauri::Builder<tauri::Wry> {
    let updater_builder = tauri_plugin_updater::Builder::new();

    tauri::Builder::default()
        .plugin({
            let file_name = chrono::Local::now()
                .format("voquill_%Y-%m-%d_%H%M%S")
                .to_string();
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::LogDir {
                        file_name: Some(file_name),
                    }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Debug)
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .format(|out, message, record| {
                    let now = chrono::Local::now();
                    out.finish(format_args!(
                        "[{}][{}][{}] {}",
                        now.format("%Y-%m-%d][%H:%M:%S%.3f"),
                        record.level(),
                        record.target(),
                        message
                    ))
                })
                .build()
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, bring the existing window to the foreground
            if let Some(window) = app.get_webview_window("main") {
                let _ = crate::platform::window::surface_main_window(&window);
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_HIDDEN_ARG]),
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
        .plugin(tauri_plugin_shell::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if window.label() == "main" {
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    {
                        if let Err(err) = crate::platform::macos::dock::hide_dock_icon() {
                            log::error!("Failed to hide dock icon: {err}");
                        }
                    }
                }
            }
        })
        .setup(|app| {
            std::panic::set_hook(Box::new(|info| {
                log::error!("PANIC: {info}");
            }));

            log::info!("Starting application setup...");

            // Purge old log files, keeping the latest 10
            crate::system::diagnostics::purge_old_logs(app.handle());

            // Write startup diagnostics for debugging
            crate::system::diagnostics::write_startup_diagnostics(app.handle());

            let db_url = {
                let handle = app.handle();
                crate::system::paths::database_url(handle)
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
            app.manage(crate::state::OverlayState::new());
            app.manage(crate::state::RemoteReceiverState::new());

            #[cfg(desktop)]
            {
                if std::env::args().any(|arg| arg == AUTOSTART_HIDDEN_ARG) {
                    if let Some(main_window) = app.get_webview_window("main") {
                        let _ = main_window.hide();
                        #[cfg(target_os = "macos")]
                        {
                            if let Err(err) = crate::platform::macos::dock::hide_dock_icon() {
                                log::error!("Failed to hide dock icon on autostart: {err}");
                            }
                        }
                    }
                }

                crate::system::tray::setup_tray(app)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                let app_handle = app.handle();

                use crate::platform::Recorder;
                use std::sync::Arc;

                let recorder: Arc<dyn Recorder> =
                    Arc::new(crate::platform::audio::RecordingManager::new());

                app.manage(recorder);

                // Pre-warm audio output for instant chime playback
                crate::system::audio_feedback::warm_audio_output();

                // Important: Even if native overlays fail, do not fall back to using the Tauri windows
                // overlay. Systems that use native overlays to NOT take well to Tauri driven overlays.
                let use_native_overlays = crate::overlay::should_use_native_overlays();
                if use_native_overlays {
                    crate::overlay::try_create_native_overlays(app_handle);
                } else {
                    crate::overlay::ensure_pill_overlay_window(app_handle)
                        .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                    crate::overlay::ensure_toast_overlay_window(app_handle)
                        .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                    if let Some(pill_window) =
                        app_handle.get_webview_window(crate::overlay::PILL_OVERLAY_LABEL)
                    {
                        let _ = crate::platform::window::show_overlay_no_focus(&pill_window);
                        let _ =
                            crate::platform::window::set_overlay_click_through(&pill_window, true);
                    }

                    if let Some(toast_window) =
                        app_handle.get_webview_window(crate::overlay::TOAST_OVERLAY_LABEL)
                    {
                        let _ = crate::platform::window::show_overlay_no_focus(&toast_window);
                        let _ =
                            crate::platform::window::set_overlay_click_through(&toast_window, true);
                    }

                    crate::overlay::start_cursor_follower(app_handle.clone());
                }
            }

            if crate::platform::get_hotkey_strategy() == "bridge" {
                crate::system::bridge_server::start(app.handle().clone());
                crate::platform::compositor::deploy_trigger_script(app.handle());
            }

            // Open dev tools if VOQUILL_ENABLE_DEVTOOLS is set
            if std::env::var("VOQUILL_ENABLE_DEVTOOLS").is_ok() {
                log::info!("VOQUILL_ENABLE_DEVTOOLS detected, opening dev tools...");
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
            crate::commands::start_enterprise_oidc_sign_in,
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
            crate::commands::paired_remote_device_upsert,
            crate::commands::paired_remote_device_list,
            crate::commands::paired_remote_device_delete,
            crate::commands::remote_receiver_start,
            crate::commands::remote_receiver_stop,
            crate::commands::remote_receiver_status,
            crate::commands::remote_sender_deliver_final_text,
            crate::commands::remote_sender_pair_with_receiver,
            crate::commands::start_recording,
            crate::commands::stop_recording,
            crate::commands::store_transcription_audio,
            crate::commands::storage_upload_data,
            crate::commands::storage_get_download_url,
            crate::commands::surface_main_window,
            crate::commands::set_toast_overlay_click_through,
            crate::commands::set_pill_window_size,
            crate::commands::restore_overlay_focus,
            crate::commands::set_overlay_focusable,
            crate::commands::paste,
            crate::commands::transcription_create,
            crate::commands::transcription_list,
            crate::commands::transcription_delete,
            crate::commands::transcription_update,
            crate::commands::transcription_audio_load,
            crate::commands::purge_stale_transcription_audio,
            crate::commands::export_transcription,
            crate::commands::export_diagnostics,
            crate::commands::term_create,
            crate::commands::term_update,
            crate::commands::term_list,
            crate::commands::term_delete,
            crate::commands::hotkey_list,
            crate::commands::hotkey_save,
            crate::commands::hotkey_delete,
            crate::commands::set_tray_title,
            crate::commands::set_menu_icon,
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
            crate::commands::set_pill_hover_enabled,
            crate::commands::set_pill_visibility,
            crate::commands::notify_pill_style_info,
            crate::commands::start_key_listener,
            crate::commands::stop_key_listener,
            crate::commands::sync_hotkey_combos,
            crate::commands::sync_compositor_hotkeys,
            crate::commands::reset_key_listener_state,
            crate::commands::play_audio,
            crate::commands::get_text_field_info,
            crate::commands::get_screen_context,
            crate::commands::get_selected_text,
            crate::commands::read_enterprise_target,
            crate::commands::run_terminal_command,
            crate::commands::get_hotkey_strategy,
            crate::commands::supports_app_detection,
            crate::commands::supports_paste_keybinds,
            crate::commands::get_keyboard_language,
            crate::commands::conversation_create,
            crate::commands::conversation_list,
            crate::commands::conversation_update,
            crate::commands::conversation_delete,
            crate::commands::chat_message_create,
            crate::commands::chat_message_list,
            crate::commands::chat_message_update,
            crate::commands::chat_message_delete_many,
            crate::commands::check_app_location_writable,
            crate::commands::download_and_open_mac_installer,
        ])
}

pub fn run(context: tauri::Context) -> Result<(), tauri::Error> {
    let app = build().build(context)?;
    app.run(handle_run_event);
    Ok(())
}
