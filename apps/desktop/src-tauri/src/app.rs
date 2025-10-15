use sqlx::sqlite::SqlitePoolOptions;
use tauri::Manager;

pub fn build() -> tauri::Builder<tauri::Wry> {
    let updater_builder = match std::env::var("TAURI_UPDATER_PUBLIC_KEY")
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        Some(pubkey) => tauri_plugin_updater::Builder::new().pubkey(pubkey),
        None => tauri_plugin_updater::Builder::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(crate::db::DB_CONNECTION, crate::db::migrations())
                .build(),
        )
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_opener::init())
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

            app.manage(crate::state::OptionKeyDatabase::new(pool));
            app.manage(crate::state::OptionKeyCounter::new(initial_count));

            #[cfg(desktop)]
            {
                crate::system::tray::setup_tray(app)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }

            #[cfg(target_os = "macos")]
            {
                let app_handle = app.handle();

                use crate::platform::{Recorder, Transcriber};
                use std::sync::Arc;

                let model_path = crate::system::models::ensure_whisper_model(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                let transcriber: Arc<dyn Transcriber> = Arc::new(
                    crate::platform::macos::whisper::WhisperTranscriber::new(&model_path).map_err(
                        |err| -> Box<dyn std::error::Error> {
                            Box::new(std::io::Error::new(std::io::ErrorKind::Other, err))
                        },
                    )?,
                );
                let recorder: Arc<dyn Recorder> =
                    Arc::new(crate::platform::macos::audio::RecordingManager::new());

                crate::platform::macos::input::spawn_alt_listener(
                    &app_handle,
                    recorder.clone(),
                    transcriber.clone(),
                )
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

                app.manage(recorder);
                app.manage(transcriber);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::greet,
            crate::commands::get_option_key_count
        ])
}
