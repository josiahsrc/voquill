use sqlx::sqlite::SqlitePoolOptions;
use tauri::{Manager, WindowEvent};

pub fn build() -> tauri::Builder<tauri::Wry> {
    let updater_builder = tauri_plugin_updater::Builder::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(crate::db::DB_CONNECTION, crate::db::migrations())
                .build(),
        )
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
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

            let initial_count =
                tauri::async_runtime::block_on(crate::db::queries::ensure_row(pool.clone()))
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

            app.manage(crate::state::OptionKeyDatabase::new(pool.clone()));
            app.manage(crate::state::OptionKeyCounter::new(initial_count));

            #[cfg(desktop)]
            {
                crate::system::tray::setup_tray(app)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                let app_handle = app.handle();

                use crate::platform::{Recorder, Transcriber};
                use std::sync::Arc;

                let model_path = crate::system::models::ensure_whisper_model(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                let transcriber: Arc<dyn Transcriber> = Arc::new(
                    crate::platform::whisper::WhisperTranscriber::new(&model_path).map_err(
                        |err| -> Box<dyn std::error::Error> {
                            Box::new(std::io::Error::new(std::io::ErrorKind::Other, err))
                        },
                    )?,
                );
                let recorder: Arc<dyn Recorder> =
                    Arc::new(crate::platform::audio::RecordingManager::new());

                crate::platform::key_state::spawn_keys_held_emitter(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                #[cfg(target_os = "macos")]
                crate::platform::macos::input::spawn_alt_listener(
                    &app_handle,
                    recorder.clone(),
                    transcriber.clone(),
                )
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                #[cfg(target_os = "linux")]
                crate::platform::linux::input::spawn_alt_listener(
                    &app_handle,
                    recorder.clone(),
                    transcriber.clone(),
                )
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                #[cfg(target_os = "windows")]
                crate::platform::windows::input::spawn_alt_listener(
                    &app_handle,
                    recorder.clone(),
                    transcriber.clone(),
                )
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                app.manage(recorder);
                app.manage(transcriber);

                ensure_overlay_window(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::greet,
            crate::commands::get_option_key_count,
            crate::commands::user_get_one,
            crate::commands::user_set_one,
            crate::commands::start_recording,
            crate::commands::stop_recording,
            crate::commands::transcription_create,
            crate::commands::transcription_list,
            crate::commands::transcription_delete,
            crate::commands::term_create,
            crate::commands::term_update,
            crate::commands::term_list,
            crate::commands::term_delete,
            crate::commands::hotkey_list,
            crate::commands::hotkey_save,
            crate::commands::hotkey_delete,
        ])
}

fn ensure_overlay_window(_app: &tauri::AppHandle) -> tauri::Result<()> {
    #[cfg(not(target_os = "macos"))]
    {
      use tauri::WebviewWindowBuilder;
      if _app.get_webview_window("recording-overlay").is_some() {
        return Ok(());
      }

      const OVERLAY_WINDOW_WIDTH: f64 = 360.0;
      const OVERLAY_WINDOW_HEIGHT: f64 = 80.0;

      WebviewWindowBuilder::new(_app, "recording-overlay", overlay_webview_url(_app)?)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .inner_size(OVERLAY_WINDOW_WIDTH, OVERLAY_WINDOW_HEIGHT)
        .build()?;
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn overlay_webview_url(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewUrl> {
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
