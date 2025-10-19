use crate::domain::{
    AltEventPayload, RecordingErrorPayload, RecordingFinishedPayload, RecordingLevelPayload,
    RecordingProcessingPayload, RecordingResult, RecordingStartedPayload,
    TranscriptionReceivedPayload, EVT_ALT_PRESSED, EVT_REC_ERROR, EVT_REC_FINISH, EVT_REC_LEVEL,
    EVT_REC_PROCESSING, EVT_REC_START, EVT_TRANSCRIPTION_RECEIVED,
};
use crate::platform::{keyboard, LevelCallback, Recorder, Transcriber};
use crate::platform::linux::feedback::{play_recording_start_tone, play_recording_stop_tone};
use crate::state::{OptionKeyCounter, OptionKeyDatabase};
use crate::db;
use enigo::{Enigo, Key, KeyboardControllable};
use rdev::{EventType, Key as RdevKey};
use serde::Serialize;
use std::{
    env,
    sync::{atomic::AtomicBool, atomic::Ordering, Arc},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};

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

    let is_hotkey_active = Arc::new(AtomicBool::new(false));
    let ctrl_pressed = Arc::new(AtomicBool::new(false));
    let shift_pressed = Arc::new(AtomicBool::new(false));
    let f8_pressed = Arc::new(AtomicBool::new(false));

    let hotkey_state = is_hotkey_active.clone();
    let ctrl_state = ctrl_pressed.clone();
    let shift_state = shift_pressed.clone();
    let f8_state = f8_pressed.clone();
    let emit_handle = app_handle.clone();
    let db_pool_handle = db_pool.clone();
    let recorder_handle = recorder.clone();
    let transcriber_handle = transcriber.clone();
    let press_counter_handle = press_counter.clone();

    keyboard::register_handler(move |event| match event.event_type {
        EventType::KeyPress(key) => {
            update_hotkey_state_for_key(key, true, &ctrl_state, &shift_state, &f8_state);

            if hotkey_combo_active(&ctrl_state, &shift_state, &f8_state)
                && !hotkey_state.swap(true, Ordering::SeqCst)
            {
                let level_emit_handle = emit_handle.clone();
                let level_emitter: LevelCallback = Arc::new(move |levels: Vec<f32>| {
                    let payload = RecordingLevelPayload { levels };
                    emit_overlay_event(&level_emit_handle, EVT_REC_LEVEL, payload);
                });

                match recorder_handle.start(Some(level_emitter)) {
                    Ok(()) => {
                        play_recording_start_tone();
                        let started_at_ms = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis()
                            .min(u128::from(u64::MAX))
                            as u64;
                        let payload = RecordingStartedPayload { started_at_ms };
                        emit_overlay_event(&emit_handle, EVT_REC_START, payload);
                    }
                    Err(err) => {
                        eprintln!("Failed to start recording: {err}");
                        emit_recording_error(&emit_handle, err.to_string());
                        hotkey_state.store(false, Ordering::SeqCst);
                        return;
                    }
                }

                let new_count = match tauri::async_runtime::block_on(db::queries::increment_count(
                    db_pool_handle.clone(),
                )) {
                    Ok(count) => {
                        press_counter_handle.store(count, Ordering::SeqCst);
                        count
                    }
                    Err(err) => {
                        eprintln!("Failed to update hotkey count in database: {err}");
                        let fallback_count =
                            press_counter_handle.fetch_add(1, Ordering::SeqCst) + 1;
                        if let Err(sync_err) = tauri::async_runtime::block_on(
                            db::queries::set_count(db_pool_handle.clone(), fallback_count),
                        ) {
                            eprintln!("Failed to sync fallback hotkey count: {sync_err}");
                        }
                        fallback_count
                    }
                };
                let payload = AltEventPayload { count: new_count };
                emit_overlay_event(&emit_handle, EVT_ALT_PRESSED, payload);
            }
        }
        EventType::KeyRelease(key) => {
            update_hotkey_state_for_key(key, false, &ctrl_state, &shift_state, &f8_state);

            if !hotkey_combo_active(&ctrl_state, &shift_state, &f8_state)
                && hotkey_state.swap(false, Ordering::SeqCst)
            {
                match recorder_handle.stop() {
                    Ok(result) => {
                        play_recording_stop_tone();
                        handle_recording_success(
                            emit_handle.clone(),
                            transcriber_handle.clone(),
                            result,
                        )
                    }
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
    });

    Ok(())
}

pub(crate) fn handle_recording_success(
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
    let emit_processing = emit_handle.clone();
    let emit_finished = emit_handle.clone();
    let emit_error = emit_handle.clone();
    let emit_transcription = emit_handle.clone();

    let processing_payload = RecordingProcessingPayload {
        duration_ms,
        size_bytes,
    };
    emit_overlay_event(&emit_processing, EVT_REC_PROCESSING, processing_payload);

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
        emit_overlay_event(&emit_finished, EVT_REC_FINISH, payload);

        if let Some(text) = transcription {
            let payload = TranscriptionReceivedPayload { text: text.clone() };
            emit_overlay_event(&emit_transcription, EVT_TRANSCRIPTION_RECEIVED, payload);

            if let Err(err) = type_text_into_focused_field(&text) {
                eprintln!("Failed to type transcription into field: {err}");
            }
        }
    });
}

pub(crate) fn emit_recording_error(app: &tauri::AppHandle, message: String) {
    let payload = RecordingErrorPayload {
        message: message.clone(),
    };
    emit_overlay_event(app, EVT_REC_ERROR, payload);
}

fn type_text_into_focused_field(text: &str) -> Result<(), String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    let override_text = env::var("VOQUILL_DEBUG_PASTE_TEXT").ok();
    let target = override_text.as_deref().unwrap_or(trimmed);
    eprintln!(
        "[voquill] attempting to inject text ({} chars)",
        target.chars().count()
    );

    paste_via_clipboard(target).or_else(|err| {
        eprintln!("Clipboard paste failed ({err}). Falling back to simulated typing.");
        let mut enigo = Enigo::new();
        enigo.key_up(Key::Shift);
        enigo.key_up(Key::Control);
        enigo.key_up(Key::Alt);
        thread::sleep(Duration::from_millis(30));
        enigo.key_sequence(target);
        Ok(())
    })
}

fn emit_overlay_event<T>(app: &tauri::AppHandle, event: &str, payload: T)
where
    T: Serialize + Clone,
{
    match app.emit(event, payload.clone()) {
        Ok(()) => eprintln!("[overlay-debug] emitted {event} to all windows"),
        Err(err) => eprintln!("Failed to emit {event} event to all windows: {err}"),
    }

    if let Some(overlay) = app.get_webview_window("recording-overlay") {
        match overlay.emit(event, payload) {
            Ok(()) => eprintln!("[overlay-debug] emitted {event} directly to overlay window"),
            Err(err) => eprintln!("Failed to emit {event} to overlay window: {err}"),
        }
    } else {
        eprintln!("[overlay-debug] overlay window not available for {event}");
    }
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = clipboard.get_text().ok();
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(40));

    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));
    enigo.key_down(Key::Control);
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    enigo.key_up(Key::Control);

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.set_text(old);
            }
        });
    }

    Ok(())
}

fn update_hotkey_state_for_key(
    key: RdevKey,
    is_pressed: bool,
    ctrl_state: &Arc<AtomicBool>,
    shift_state: &Arc<AtomicBool>,
    f8_state: &Arc<AtomicBool>,
) {
    match key {
        RdevKey::ControlLeft | RdevKey::ControlRight => {
            ctrl_state.store(is_pressed, Ordering::SeqCst);
        }
        RdevKey::ShiftLeft | RdevKey::ShiftRight => {
            shift_state.store(is_pressed, Ordering::SeqCst);
        }
        RdevKey::F8 => {
            f8_state.store(is_pressed, Ordering::SeqCst);
        }
        _ => {}
    }
}

fn hotkey_combo_active(
    ctrl_state: &Arc<AtomicBool>,
    shift_state: &Arc<AtomicBool>,
    f8_state: &Arc<AtomicBool>,
) -> bool {
    ctrl_state.load(Ordering::SeqCst)
        && shift_state.load(Ordering::SeqCst)
        && f8_state.load(Ordering::SeqCst)
}
