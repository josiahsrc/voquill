use crate::db;
use crate::domain::{
    AltEventPayload, RecordingErrorPayload, RecordingFinishedPayload, RecordingResult,
    RecordingStartedPayload, TranscriptionReceivedPayload, EVT_ALT_PRESSED, EVT_REC_ERROR,
    EVT_REC_FINISH, EVT_REC_START, EVT_TRANSCRIPTION_RECEIVED,
};
use crate::platform::{
    key_state::{emit_keys_snapshot, new_pressed_keys_state, update_pressed_keys_state},
    Recorder, Transcriber,
};
use crate::state::{OptionKeyCounter, OptionKeyDatabase};
use enigo::{Enigo, Key, KeyboardControllable};
use rdev::{listen, EventType, Key as RdevKey};
use std::{
    env,
    sync::atomic::{AtomicBool, Ordering},
    sync::Arc,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
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
        let is_hotkey_active = Arc::new(AtomicBool::new(false));
        let ctrl_pressed = Arc::new(AtomicBool::new(false));
        let shift_pressed = Arc::new(AtomicBool::new(false));
        let f8_pressed = Arc::new(AtomicBool::new(false));
        let pressed_keys = new_pressed_keys_state();

        let emit_handle = app_handle.clone();
        let recorder_handle = recorder.clone();
        let transcriber_handle = transcriber.clone();

        let result = listen({
            let hotkey_state = is_hotkey_active.clone();
            let ctrl_state = ctrl_pressed.clone();
            let shift_state = shift_pressed.clone();
            let f8_state = f8_pressed.clone();
            let pressed_keys_state = pressed_keys.clone();

            let emit_handle = emit_handle.clone();
            let db_pool = db_pool.clone();
            let recorder = recorder_handle.clone();
            let transcriber = transcriber_handle.clone();
            let press_counter = press_counter.clone();

            move |event| match event.event_type {
                EventType::KeyPress(key) => {
                    if let Some(snapshot) =
                        update_pressed_keys_state(&pressed_keys_state, key, true)
                    {
                        emit_keys_snapshot(&emit_handle, snapshot);
                    }

                    update_hotkey_state_for_key(key, true, &ctrl_state, &shift_state, &f8_state);

                    if hotkey_combo_active(&ctrl_state, &shift_state, &f8_state)
                        && !hotkey_state.swap(true, Ordering::SeqCst)
                    {
                        match recorder.start() {
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
                                hotkey_state.store(false, Ordering::SeqCst);
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
                                eprintln!("Failed to update hotkey count in database: {err}");
                                let fallback_count =
                                    press_counter.fetch_add(1, Ordering::SeqCst) + 1;
                                if let Err(sync_err) = tauri::async_runtime::block_on(
                                    db::queries::set_count(db_pool.clone(), fallback_count),
                                ) {
                                    eprintln!("Failed to sync fallback hotkey count: {sync_err}");
                                }
                                fallback_count
                            }
                        };
                        let payload = AltEventPayload { count: new_count };
                        if let Err(err) =
                            emit_handle.emit_to(EventTarget::any(), EVT_ALT_PRESSED, payload)
                        {
                            eprintln!("Failed to emit hotkey-pressed event: {err}");
                        }
                    }
                }
                EventType::KeyRelease(key) => {
                    if let Some(snapshot) =
                        update_pressed_keys_state(&pressed_keys_state, key, false)
                    {
                        emit_keys_snapshot(&emit_handle, snapshot);
                    }

                    update_hotkey_state_for_key(key, false, &ctrl_state, &shift_state, &f8_state);

                    if !hotkey_combo_active(&ctrl_state, &shift_state, &f8_state)
                        && hotkey_state.swap(false, Ordering::SeqCst)
                    {
                        match recorder.stop() {
                            Ok(result) => handle_recording_success(
                                emit_handle.clone(),
                                transcriber.clone(),
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
            eprintln!("Failed to listen for hotkey events: {err:?}");
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
    let emit_transcription = emit_handle.clone();

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
            let payload = TranscriptionReceivedPayload { text: text.clone() };
            if let Err(err) =
                emit_transcription.emit_to(EventTarget::any(), EVT_TRANSCRIPTION_RECEIVED, payload)
            {
                eprintln!("Failed to emit transcription-received event: {err}");
            }

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
    pressed: bool,
    ctrl: &Arc<AtomicBool>,
    shift: &Arc<AtomicBool>,
    f8: &Arc<AtomicBool>,
) {
    let value = pressed;
    match key {
        RdevKey::ControlLeft | RdevKey::ControlRight => ctrl.store(value, Ordering::SeqCst),
        RdevKey::ShiftLeft | RdevKey::ShiftRight => shift.store(value, Ordering::SeqCst),
        RdevKey::F8 => f8.store(value, Ordering::SeqCst),
        _ => {}
    }
}

fn hotkey_combo_active(
    ctrl: &Arc<AtomicBool>,
    shift: &Arc<AtomicBool>,
    f8: &Arc<AtomicBool>,
) -> bool {
    f8.load(Ordering::SeqCst) || (ctrl.load(Ordering::SeqCst) && shift.load(Ordering::SeqCst))
}
