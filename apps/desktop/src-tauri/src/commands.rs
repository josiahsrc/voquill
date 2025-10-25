use std::path::PathBuf;
use std::convert::TryInto;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, EventTarget, State};

use crate::domain::{
    ApiKey, ApiKeyCreateRequest, ApiKeyView, OverlayPhase, OverlayPhasePayload, RecordingLevelPayload,
    TranscriptionAudioSnapshot, EVT_OVERLAY_PHASE, EVT_REC_LEVEL,
};
use crate::platform::{GpuDescriptor, LevelCallback, TranscriptionDevice, TranscriptionRequest};
use crate::system::crypto::protect_api_key;
use sqlx::Row;

#[cfg(target_os = "linux")]
use crate::platform::linux::input::paste_text_into_focused_field as platform_paste_text;
#[cfg(target_os = "macos")]
use crate::platform::macos::input::paste_text_into_focused_field as platform_paste_text;
#[cfg(target_os = "windows")]
use crate::platform::windows::input::paste_text_into_focused_field as platform_paste_text;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StopRecordingResponse {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

#[derive(serde::Deserialize)]
pub enum AudioClip {
    #[serde(rename = "start_recording_clip")]
    StartRecordingClip,
    #[serde(rename = "stop_recording_clip")]
    StopRecordingClip,
}

#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StartRecordingArgs {
    pub preferred_microphone: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionDeviceSelectionDto {
    #[serde(default)]
    pub cpu: bool,
    pub device_id: Option<u32>,
    pub device_name: Option<String>,
}

impl TranscriptionDeviceSelectionDto {
    fn into_request(self) -> TranscriptionRequest {
        let mut request = TranscriptionRequest::default();

        if self.cpu {
            request.device = Some(TranscriptionDevice::Cpu);
            return request;
        }

        if self.device_id.is_some() || self.device_name.is_some() {
            request.device = Some(TranscriptionDevice::Gpu(GpuDescriptor {
                id: self.device_id,
                name: self.device_name,
            }));
        }

        request
    }
}

const MAX_RETAINED_TRANSCRIPTION_AUDIO: usize = 20;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionAudioData {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

async fn delete_audio_entries(
    app: AppHandle,
    entries: Vec<(String, String)>,
) -> Result<Vec<String>, String> {
    if entries.is_empty() {
        return Ok(Vec::new());
    }

    tauri::async_runtime::spawn_blocking(move || {
        let mut removed = Vec::new();
        for (id, path) in entries {
            let file_path = PathBuf::from(&path);
            if let Err(err) = crate::system::audio_store::delete_audio_file(&app, &file_path) {
                eprintln!("Failed to delete audio file for transcription {id}: {err}");
            }
            removed.push(id);
        }
        removed
    })
    .await
    .map_err(|err| err.to_string())
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
pub fn list_microphones() -> Vec<crate::platform::audio::InputDeviceDescriptor> {
    crate::platform::audio::list_input_devices()
}

#[tauri::command]
pub fn list_gpus() -> Vec<crate::system::gpu::GpuAdapterInfo> {
    crate::system::gpu::list_available_gpus()
}

#[tauri::command]
pub fn ensure_microphone_permission() -> Result<crate::domain::PermissionStatus, String> {
    crate::platform::permissions::ensure_microphone_permission()
}

#[tauri::command]
pub fn ensure_input_monitor_permission() -> Result<crate::domain::PermissionStatus, String> {
    crate::platform::permissions::ensure_input_monitor_permission()
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
    app: AppHandle,
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    let pool = database.pool();

    let audio_path: Option<String> = sqlx::query_scalar(
        "SELECT audio_path
         FROM transcriptions
         WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|err| err.to_string())?;

    if let Some(path) = audio_path {
        delete_audio_entries(app.clone(), vec![(id.clone(), path)]).await?;
    }

    crate::db::transcription_queries::delete_transcription(pool, &id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_update(
    transcription: crate::domain::Transcription,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Transcription, String> {
    crate::db::transcription_queries::update_transcription(database.pool(), &transcription)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_audio_load(
    app: AppHandle,
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<TranscriptionAudioData, String> {
    let pool = database.pool();

    let audio_path: Option<String> = sqlx::query_scalar(
        "SELECT audio_path
         FROM transcriptions
         WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|err| err.to_string())?;

    let audio_path = audio_path
        .ok_or_else(|| "No audio snapshot available for this transcription".to_string())?;

    let audio_dir = crate::system::audio_store::audio_dir(&app).map_err(|err| err.to_string())?;
    let audio_path_buf = PathBuf::from(&audio_path);

    if !audio_path_buf.starts_with(&audio_dir) {
        return Err("Audio snapshot path is outside the managed directory".to_string());
    }

    let (samples, sample_rate) = tauri::async_runtime::spawn_blocking(move || {
        crate::system::audio_store::load_audio_samples(&audio_path_buf)
            .map_err(|err| err.to_string())
    })
    .await
    .map_err(|err| err.to_string())??;

    Ok(TranscriptionAudioData {
        samples,
        sample_rate,
    })
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

fn current_timestamp_millis() -> Result<i64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| err.to_string())?;

    match duration.as_millis().try_into() {
        Ok(value) => Ok(value),
        Err(_) => Ok(i64::MAX),
    }
}

#[tauri::command]
pub async fn api_key_create(
    api_key: ApiKeyCreateRequest,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<ApiKeyView, String> {
    let ApiKeyCreateRequest {
        id,
        name,
        provider,
        key,
    } = api_key;

    let protected = protect_api_key(&key);
    let created_at = current_timestamp_millis()?;

    let stored = ApiKey {
        id,
        name,
        provider,
        created_at,
        salt: protected.salt_b64,
        key_hash: protected.hash_b64,
        key_ciphertext: protected.ciphertext_b64,
        key_suffix: protected.key_suffix,
    };

    crate::db::api_key_queries::insert_api_key(database.pool(), &stored)
        .await
        .map(ApiKeyView::from)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn api_key_list(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Vec<ApiKeyView>, String> {
    crate::db::api_key_queries::fetch_api_keys(database.pool())
        .await
        .map(|api_keys| api_keys.into_iter().map(ApiKeyView::from).collect())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn api_key_delete(
    id: String,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    crate::db::api_key_queries::delete_api_key(database.pool(), &id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn clear_local_data(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<(), String> {
    let pool = database.pool();
    let mut transaction = pool.begin().await.map_err(|err| err.to_string())?;

    const TABLES_TO_CLEAR: [&str; 5] =
        ["user_profiles", "transcriptions", "terms", "hotkeys", "api_keys"];

    for table in TABLES_TO_CLEAR {
        let statement = format!("DELETE FROM {table}");
        sqlx::query(&statement)
            .execute(&mut *transaction)
            .await
            .map_err(|err| err.to_string())?;
    }

    transaction.commit().await.map_err(|err| err.to_string())?;

    if let Err(err) = sqlx::query("VACUUM").execute(&pool).await {
        eprintln!("VACUUM failed after clearing local data: {err}");
    }

    Ok(())
}

#[tauri::command]
pub fn play_audio(clip: AudioClip) -> Result<(), String> {
    match clip {
        AudioClip::StartRecordingClip => crate::system::audio_feedback::play_start_recording_clip(),
        AudioClip::StopRecordingClip => crate::system::audio_feedback::play_stop_recording_clip(),
    }

    Ok(())
}

#[tauri::command]
pub fn start_recording(
    app: AppHandle,
    recorder: State<'_, Arc<dyn crate::platform::Recorder>>,
    args: Option<StartRecordingArgs>,
) -> Result<(), String> {
    let options = args.unwrap_or_default();

    recorder.set_preferred_input_device(options.preferred_microphone.clone());

    let level_emit_handle = app.clone();
    let level_emitter: LevelCallback = Arc::new(move |levels: Vec<f32>| {
        let payload = RecordingLevelPayload { levels };
        if let Err(err) = level_emit_handle.emit_to(EventTarget::any(), EVT_REC_LEVEL, payload) {
            eprintln!("Failed to emit recording_level event: {err}");
        }
    });

    match recorder.start(Some(level_emitter)) {
        Ok(()) => Ok(()),
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
            Err(message)
        }
    }
}

#[tauri::command]
pub fn stop_recording(
    _app: AppHandle,
    recorder: State<'_, Arc<dyn crate::platform::Recorder>>,
) -> Result<StopRecordingResponse, String> {
    match recorder.stop() {
        Ok(result) => {
            let audio = result.audio;
            Ok(StopRecordingResponse {
                samples: audio.samples,
                sample_rate: audio.sample_rate,
            })
        }
        Err(err) => {
            let not_recording = (&*err)
                .downcast_ref::<crate::errors::RecordingError>()
                .map(|inner| matches!(inner, crate::errors::RecordingError::NotRecording))
                .unwrap_or(false);

            if not_recording {
                return Ok(StopRecordingResponse {
                    samples: Vec::new(),
                    sample_rate: 0,
                });
            }

            let message = err.to_string();
            eprintln!("Failed to stop recording via command: {message}");
            Err(message)
        }
    }
}

#[tauri::command]
pub async fn store_transcription_audio(
    app: AppHandle,
    id: String,
    samples: Vec<f64>,
    sample_rate: u32,
) -> Result<TranscriptionAudioSnapshot, String> {
    if sample_rate == 0 {
        return Err("Audio sample rate must be greater than zero".to_string());
    }

    let mut filtered = Vec::with_capacity(samples.len());
    for sample in samples {
        if sample.is_finite() {
            filtered.push(sample as f32);
        }
    }

    if filtered.is_empty() {
        return Err("No usable audio samples provided".to_string());
    }

    let handle = app.clone();
    let audio_id = id.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        crate::system::audio_store::save_transcription_audio(
            &handle,
            &audio_id,
            &filtered,
            sample_rate,
        )
        .map_err(|err| err.to_string())
    })
    .await
    .map_err(|err| err.to_string())?;

    result
}

#[tauri::command]
pub async fn transcribe_audio(
    samples: Vec<f64>,
    sample_rate: u32,
    device: Option<TranscriptionDeviceSelectionDto>,
    transcriber: State<'_, Arc<dyn crate::platform::Transcriber>>,
) -> Result<String, String> {
    let request = device.map(|dto| dto.into_request());
    let transcriber = transcriber.inner().clone();
    let join_result = tauri::async_runtime::spawn_blocking(move || {
        let original_len = samples.len();
        let mut filtered = Vec::with_capacity(original_len);
        for sample in samples {
            if sample.is_finite() {
                filtered.push(sample as f32);
            }
        }

        if filtered.len() != original_len {
            eprintln!(
                "Discarded {} non-finite audio samples before transcription",
                original_len - filtered.len()
            );
        }

        if filtered.is_empty() {
            return Err("No usable audio samples provided".to_string());
        }

        let request_ref = request.as_ref();
        transcriber
            .transcribe(filtered.as_slice(), sample_rate, request_ref)
            .map(|text| text.trim().to_string())
    })
    .await;

    match join_result {
        Ok(result) => {
            if let Err(err) = result.as_ref() {
                eprintln!("Transcription failed: {err}");
            }

            result
        }
        Err(err) => {
            let message = format!("Transcription task join error: {err}");
            eprintln!("{message}");
            Err(message)
        }
    }
}

#[tauri::command]
pub async fn purge_stale_transcription_audio(
    app: AppHandle,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Vec<String>, String> {
    let pool = database.pool();

    let rows = sqlx::query(
        "SELECT id, audio_path
         FROM transcriptions
         WHERE audio_path IS NOT NULL
         ORDER BY timestamp DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|err| err.to_string())?;

    let stale_entries: Vec<(String, String)> = rows
        .into_iter()
        .skip(MAX_RETAINED_TRANSCRIPTION_AUDIO)
        .map(|row| {
            (
                row.get::<String, _>("id"),
                row.get::<String, _>("audio_path"),
            )
        })
        .collect();

    if stale_entries.is_empty() {
        return Ok(Vec::new());
    }

    let purged_ids = delete_audio_entries(app.clone(), stale_entries).await?;

    if purged_ids.is_empty() {
        return Ok(purged_ids);
    }

    for id in &purged_ids {
        sqlx::query(
            "UPDATE transcriptions
             SET audio_path = NULL,
                 audio_duration_ms = NULL
             WHERE id = ?1",
        )
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|err| err.to_string())?;
    }

    Ok(purged_ids)
}

#[tauri::command]
pub async fn paste(text: String) -> Result<(), String> {
    let join_result =
        tauri::async_runtime::spawn_blocking(move || platform_paste_text(&text)).await;

    match join_result {
        Ok(result) => {
            if let Err(err) = result.as_ref() {
                eprintln!("Paste failed: {err}");
            }

            result
        }
        Err(err) => {
            let message = format!("Paste task join error: {err}");
            eprintln!("{message}");
            Err(message)
        }
    }
}

#[tauri::command]
pub fn set_phase(app: AppHandle, phase: String) -> Result<(), String> {
    let resolved =
        OverlayPhase::from_str(phase.as_str()).ok_or_else(|| format!("invalid phase: {phase}"))?;

    #[cfg(target_os = "macos")]
    if let Err(err) = crate::platform::macos::notch_overlay::set_phase(resolved.clone()) {
        eprintln!("Failed to set macOS overlay phase: {err}");
    }

    let payload = OverlayPhasePayload {
        phase: resolved.clone(),
    };

    app.emit_to(EventTarget::any(), EVT_OVERLAY_PHASE, payload)
        .map_err(|err| err.to_string())
}
