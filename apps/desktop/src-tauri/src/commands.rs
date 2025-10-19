use std::sync::Arc;
use tauri::{AppHandle, Emitter, EventTarget, State};

use crate::domain::{
    OverlayPhase, OverlayPhasePayload, RecordingLevelPayload, EVT_OVERLAY_PHASE, EVT_REC_LEVEL,
};
use crate::platform::LevelCallback;

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
pub async fn transcribe_audio(
    samples: Vec<f64>,
    sample_rate: u32,
    transcriber: State<'_, Arc<dyn crate::platform::Transcriber>>,
) -> Result<String, String> {
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

        transcriber
            .transcribe(filtered.as_slice(), sample_rate)
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
