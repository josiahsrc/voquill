use crate::db;
use crate::domain::{
    AltEventPayload, RecordingErrorPayload, RecordingFinishedPayload, RecordingResult,
    RecordingStartedPayload, TranscriptionReceivedPayload, EVT_ALT_PRESSED, EVT_REC_ERROR,
    EVT_REC_FINISH, EVT_REC_START, EVT_TRANSCRIPTION_RECEIVED, LEFT_OPTION_KEYCODE,
    RIGHT_OPTION_KEYCODE,
};
use crate::platform::{
    key_state::{emit_keys_snapshot, new_pressed_keys_state, update_pressed_keys_state},
    Recorder, Transcriber,
};
use crate::state::{OptionKeyCounter, OptionKeyDatabase};
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::event::{
    CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement,
    CGEventType, EventField,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use rdev::{listen, EventType};
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

        let event_tap = match CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::FlagsChanged, CGEventType::KeyDown],
            {
                let counter = press_counter.clone();
                let alt_state = is_alt_pressed.clone();
                let emit_handle = emit_handle.clone();
                let pool = db_pool.clone();
                let recorder = recorder_handle.clone();
                move |_proxy, event_type, event| {
                    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
                    if keycode == LEFT_OPTION_KEYCODE || keycode == RIGHT_OPTION_KEYCODE {
                        let maybe_pressed = match event_type {
                            CGEventType::FlagsChanged => Some(
                                event
                                    .get_flags()
                                    .contains(CGEventFlags::CGEventFlagAlternate),
                            ),
                            CGEventType::KeyDown => Some(true),
                            _ => None,
                        };

                        if let Some(currently_pressed) = maybe_pressed {
                            let was_pressed = alt_state.swap(currently_pressed, Ordering::SeqCst);

                            if currently_pressed && !was_pressed {
                                match recorder.start() {
                                    Ok(()) => {
                                        let started_at_ms = SystemTime::now()
                                            .duration_since(UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis()
                                            .min(u128::from(u64::MAX))
                                            as u64;
                                        let payload = RecordingStartedPayload { started_at_ms };
                                        if let Err(err) = emit_handle.emit_to(
                                            EventTarget::any(),
                                            EVT_REC_START,
                                            payload,
                                        ) {
                                            eprintln!(
                                                "Failed to emit recording-started event: {err}"
                                            );
                                        }
                                    }
                                    Err(err) => {
                                        eprintln!("Failed to start recording: {err}");
                                        emit_recording_error(&emit_handle, err.to_string());
                                    }
                                }

                                let new_count = match tauri::async_runtime::block_on(
                                    db::queries::increment_count(pool.clone()),
                                ) {
                                    Ok(count) => {
                                        counter.store(count, Ordering::SeqCst);
                                        count
                                    }
                                    Err(err) => {
                                        eprintln!(
                                            "Failed to update option key count in database: {err}"
                                        );
                                        let fallback_count =
                                            counter.fetch_add(1, Ordering::SeqCst) + 1;
                                        if let Err(sync_err) = tauri::async_runtime::block_on(
                                            db::queries::set_count(pool.clone(), fallback_count),
                                        ) {
                                            eprintln!(
                                                "Failed to sync fallback option key count: {sync_err}"
                                            );
                                        }
                                        fallback_count
                                    }
                                };
                                let payload = AltEventPayload { count: new_count };
                                if let Err(err) = emit_handle.emit_to(
                                    EventTarget::any(),
                                    EVT_ALT_PRESSED,
                                    payload,
                                ) {
                                    eprintln!("Failed to emit alt-pressed event: {err}");
                                }
                            } else if !currently_pressed && was_pressed {
                                match recorder.stop() {
                                    Ok(result) => handle_recording_success(
                                        emit_handle.clone(),
                                        transcriber_handle.clone(),
                                        result,
                                    ),
                                    Err(err) => {
                                        let is_not_recording = (&*err)
                                            .downcast_ref::<crate::errors::RecordingError>()
                                            .map(|inner| {
                                                matches!(
                                                    inner,
                                                    crate::errors::RecordingError::NotRecording
                                                )
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
                    }

                    None
                }
            },
        ) {
            Ok(tap) => tap,
            Err(_) => {
                eprintln!("Failed to create global Alt key event tap");
                return;
            }
        };

        let run_loop_source = match event_tap.mach_port.create_runloop_source(0) {
            Ok(source) => source,
            Err(_) => {
                eprintln!("Failed to create run loop source for Alt key listener");
                return;
            }
        };

        let current_loop = CFRunLoop::get_current();
        current_loop.add_source(&run_loop_source, unsafe { kCFRunLoopCommonModes });
        event_tap.enable();
        CFRunLoop::run_current();
    });

    Ok(())
}

pub fn spawn_keys_held_emitter(app: &tauri::AppHandle) -> tauri::Result<()> {
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let pressed_keys = new_pressed_keys_state();
        let emit_handle = app_handle.clone();

        let result = listen({
            let pressed_keys_state = pressed_keys.clone();

            move |event| match event.event_type {
                EventType::KeyPress(key) => {
                    if let Some(snapshot) =
                        update_pressed_keys_state(&pressed_keys_state, key, true)
                    {
                        emit_keys_snapshot(&emit_handle, snapshot);
                    }
                }
                EventType::KeyRelease(key) => {
                    if let Some(snapshot) =
                        update_pressed_keys_state(&pressed_keys_state, key, false)
                    {
                        emit_keys_snapshot(&emit_handle, snapshot);
                    }
                }
                _ => {}
            }
        });

        if let Err(err) = result {
            eprintln!("Failed to listen for keys-held events: {err:?}");
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
    if text.trim().is_empty() {
        return Ok(());
    }

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source".to_string())?;

    let key_down = core_graphics::event::CGEvent::new_keyboard_event(source.clone(), 0, true)
        .map_err(|_| "failed to create key-down event".to_string())?;
    key_down.set_string(text);
    key_down.post(CGEventTapLocation::HID);

    let key_up = core_graphics::event::CGEvent::new_keyboard_event(source, 0, false)
        .map_err(|_| "failed to create key-up event".to_string())?;
    key_up.set_string("");
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}
