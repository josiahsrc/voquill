use crate::db;
use crate::domain::{
    AltEventPayload, RecordingErrorPayload, RecordingFinishedPayload, RecordingResult,
    RecordingStartedPayload, EVT_ALT_PRESSED, EVT_REC_ERROR, EVT_REC_FINISH, EVT_REC_START,
};
use crate::platform::{Recorder, Transcriber};
use crate::state::{OptionKeyCounter, OptionKeyDatabase};
use enigo::{Enigo, KeyboardControllable};
use rdev::{listen, EventType, Key};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, EventTarget, Manager};

pub fn spawn_alt_listener(
    app: &tauri::AppHandle,
    recorder: Arc<dyn Recorder>,
    transcriber: Arc<dyn Transcriber>,
) -> tauri::Result<()> {
    let app_handle = app.clone();

    let counter_state = app.state::<OptionKeyCounter>();
    let press_counter = counter_state.clone_inner();
    drop(counter_state);

    let pool_state = app.state::<OptionKeyDatabase>();
    let db_pool = pool_state.pool();
    drop(pool_state);

    std::thread::spawn(move || {
        let is_alt_pressed = Arc::new(AtomicBool::new(false));
        let emit_handle = app_handle.clone();
        let recorder_handle = recorder.clone();
        let transcriber_handle = transcriber.clone();

        let result = listen({
            let alt_state = is_alt_pressed.clone();
            let emit_handle = emit_handle.clone();
            let db_pool = db_pool.clone();
            let press_counter = press_counter.clone();
            move |event| match event.event_type {
                EventType::KeyPress(key) if is_alt_key(key) => {
                    let was_pressed = alt_state.swap(true, Ordering::SeqCst);
                    if !was_pressed {
                        match recorder_handle.start() {
                            Ok(()) => {
                                let started_at_ms = SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis()
                                    .min(u128::from(u64::MAX))
                                    as u64;
                                let payload = RecordingStartedPayload { started_at_ms };
                                if let Err(err) =
                                    emit_handle.emit_to(EventTarget::any(), EVT_REC_START, payload)
                                {
                                    eprintln!("Failed to emit recording-started event: {err}");
                                }
                            }
                            Err(err) => {
                                eprintln!("Failed to start recording: {err}");
                                emit_recording_error(&emit_handle, err.to_string());
                                alt_state.store(false, Ordering::SeqCst);
                                return;
                            }
                        }

                        let new_count = match tauri::async_runtime::block_on(
                            db::queries::increment_count(db_pool.clone()),
                        ) {
                            Ok(count) => {
                                press_counter.store(count, Ordering::SeqCst);
                                count
                            }
                            Err(err) => {
                                eprintln!("Failed to update option key count in database: {err}");
                                let fallback_count =
                                    press_counter.fetch_add(1, Ordering::SeqCst) + 1;
                                if let Err(sync_err) = tauri::async_runtime::block_on(
                                    db::queries::set_count(db_pool.clone(), fallback_count),
                                ) {
                                    eprintln!(
                                        "Failed to sync fallback option key count: {sync_err}"
                                    );
                                }
                                fallback_count
                            }
                        };
                        let payload = AltEventPayload { count: new_count };
                        if let Err(err) =
                            emit_handle.emit_to(EventTarget::any(), EVT_ALT_PRESSED, payload)
                        {
                            eprintln!("Failed to emit alt-pressed event: {err}");
                        }
                    }
                }
                EventType::KeyRelease(key) if is_alt_key(key) => {
                    let was_pressed = alt_state.swap(false, Ordering::SeqCst);
                    if was_pressed {
                        match recorder_handle.stop() {
                            Ok(result) => handle_recording_success(
                                emit_handle.clone(),
                                transcriber_handle.clone(),
                                result,
                            ),
                            Err(err) => {
                                let is_not_recording = (&*err)
                                    .downcast_ref::<crate::errors::RecordingError>()
                                    .map(|inner| {
                                        matches!(inner, crate::errors::RecordingError::NotRecording)
                                    })
                                    .unwrap_or(false);

                                if !is_not_recording {
                                    let message = err.to_string();
                                    eprintln!("Failed to stop recording: {message}");
                                    emit_recording_error(&emit_handle, message);
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        });

        if let Err(err) = result {
            eprintln!("Failed to listen for Alt key events: {err:?}");
        }
    });

    Ok(())
}

fn handle_recording_success(
    emit_handle: tauri::AppHandle,
    transcriber: Arc<dyn Transcriber>,
    result: RecordingResult,
) {
    let duration_ms = result
        .metrics
        .duration
        .as_millis()
        .min(u128::from(u64::MAX)) as u64;
    let size_bytes = result.metrics.size_bytes;
    let samples = result.audio.samples;
    let sample_rate = result.audio.sample_rate;
    let emit_finished = emit_handle.clone();
    let emit_error = emit_handle.clone();

    std::thread::spawn(move || {
        let transcription_result = transcriber.transcribe(&samples, sample_rate);

        let mut transcription: Option<String> = None;
        if let Err(err) = transcription_result.as_ref() {
            eprintln!("Transcription failed: {err}");
            emit_recording_error(&emit_error, err.clone());
        }

        if let Ok(text) = transcription_result {
            let normalized = text.trim().to_string();
            if !normalized.is_empty() {
                transcription = Some(normalized);
            }
        }

        let payload = RecordingFinishedPayload {
            duration_ms,
            size_bytes,
            transcription: transcription.clone(),
        };
        if let Err(err) = emit_finished.emit_to(EventTarget::any(), EVT_REC_FINISH, payload) {
            eprintln!("Failed to emit recording-finished event: {err}");
        }

        if let Some(text) = transcription {
            if let Err(err) = type_text_into_focused_field(&text) {
                eprintln!("Failed to type transcription into field: {err}");
            }
        }
    });
}

fn emit_recording_error(app: &tauri::AppHandle, message: String) {
    let payload = RecordingErrorPayload {
        message: message.clone(),
    };
    if let Err(err) = app.emit_to(EventTarget::any(), EVT_REC_ERROR, payload) {
        eprintln!("Failed to emit recording-error event: {err}");
    }
}

fn type_text_into_focused_field(text: &str) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let mut enigo = Enigo::new();
    enigo.key_sequence(text);
    Ok(())
}

fn is_alt_key(key: Key) -> bool {
    matches!(key, Key::Alt | Key::AltGr | Key::MetaLeft | Key::MetaRight)
}
