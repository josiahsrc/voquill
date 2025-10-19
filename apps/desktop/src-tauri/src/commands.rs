use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, EventTarget, State};

use crate::domain::{RecordingLevelPayload, RecordingStartedPayload, EVT_REC_LEVEL, EVT_REC_START};
use crate::platform::LevelCallback;

#[cfg(target_os = "linux")]
use crate::platform::linux::input::{
    emit_recording_error as platform_emit_recording_error,
    handle_recording_success as platform_handle_recording_success,
};
#[cfg(target_os = "macos")]
use crate::platform::macos::input::{
    emit_recording_error as platform_emit_recording_error,
    handle_recording_success as platform_handle_recording_success,
};
#[cfg(target_os = "windows")]
use crate::platform::windows::input::{
    emit_recording_error as platform_emit_recording_error,
    handle_recording_success as platform_handle_recording_success,
};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
pub async fn user_set_one(
    user: crate::domain::User,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::User, String> {
    crate::db::user_queries::upsert_user(database.pool(), &user)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn user_get_one(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Option<crate::domain::User>, String> {
    crate::db::user_queries::fetch_user(database.pool())
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_create(
    transcription: crate::domain::Transcription,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Transcription, String> {
    crate::db::transcription_queries::insert_transcription(database.pool(), &transcription)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_list(
    limit: Option<u32>,
    offset: Option<u32>,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Vec<crate::domain::Transcription>, String> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);

    crate::db::transcription_queries::fetch_transcriptions(database.pool(), limit, offset)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_delete(
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    crate::db::transcription_queries::delete_transcription(database.pool(), &id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn term_create(
    term: crate::domain::Term,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Term, String> {
    crate::db::term_queries::insert_term(database.pool(), &term)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn term_update(
    term: crate::domain::Term,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Term, String> {
    crate::db::term_queries::update_term(database.pool(), &term)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn term_list(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Vec<crate::domain::Term>, String> {
    crate::db::term_queries::fetch_terms(database.pool())
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn term_delete(
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    crate::db::term_queries::delete_term(database.pool(), &id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn hotkey_list(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Vec<crate::domain::Hotkey>, String> {
    crate::db::hotkey_queries::fetch_hotkeys(database.pool())
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn hotkey_save(
    hotkey: crate::domain::Hotkey,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Hotkey, String> {
    crate::db::hotkey_queries::upsert_hotkey(database.pool(), &hotkey)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn hotkey_delete(
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    crate::db::hotkey_queries::delete_hotkey(database.pool(), &id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn start_recording(
    app: AppHandle,
    recorder: State<'_, Arc<dyn crate::platform::Recorder>>,
) -> Result<(), String> {
    let level_emit_handle = app.clone();
    let level_emitter: LevelCallback = Arc::new(move |levels: Vec<f32>| {
        let payload = RecordingLevelPayload { levels };
        if let Err(err) = level_emit_handle.emit_to(EventTarget::any(), EVT_REC_LEVEL, payload) {
            eprintln!("Failed to emit recording-level event: {err}");
        }
    });

    match recorder.start(Some(level_emitter)) {
        Ok(()) => {
            let started_at_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
                .min(u128::from(u64::MAX)) as u64;
            let payload = RecordingStartedPayload { started_at_ms };
            if let Err(err) = app.emit_to(EventTarget::any(), EVT_REC_START, payload) {
                eprintln!("Failed to emit recording-started event: {err}");
            }
            Ok(())
        }
        Err(err) => {
            let already_recording = (&*err)
                .downcast_ref::<crate::errors::RecordingError>()
                .map(|inner| matches!(inner, crate::errors::RecordingError::AlreadyRecording))
                .unwrap_or(false);

            if already_recording {
                return Ok(());
            }

            let message = err.to_string();
            eprintln!("Failed to start recording via command: {message}");
            platform_emit_recording_error(&app, message.clone());
            Err(message)
        }
    }
}

#[tauri::command]
pub fn stop_recording(
    app: AppHandle,
    recorder: State<'_, Arc<dyn crate::platform::Recorder>>,
    transcriber: State<'_, Arc<dyn crate::platform::Transcriber>>,
) -> Result<(), String> {
    match recorder.stop() {
        Ok(result) => {
            platform_handle_recording_success(app.clone(), transcriber.inner().clone(), result);
            Ok(())
        }
        Err(err) => {
            let not_recording = (&*err)
                .downcast_ref::<crate::errors::RecordingError>()
                .map(|inner| matches!(inner, crate::errors::RecordingError::NotRecording))
                .unwrap_or(false);

            if not_recording {
                return Ok(());
            }

            let message = err.to_string();
            eprintln!("Failed to stop recording via command: {message}");
            platform_emit_recording_error(&app, message.clone());
            Err(message)
        }
    }
}

#[tauri::command]
pub async fn get_option_key_count(
    counter: State<'_, crate::state::OptionKeyCounter>,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<u64, String> {
    match crate::db::queries::fetch_count(database.pool()).await {
        Ok(count) => {
            counter.store(count);
            Ok(count)
        }
        Err(err) => {
            eprintln!("db read failed: {err}");
            Ok(counter.load())
        }
    }
}
