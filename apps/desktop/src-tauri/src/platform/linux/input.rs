use crate::domain::{
    RecordingErrorPayload, RecordingFinishedPayload, RecordingProcessingPayload, RecordingResult,
    TranscriptionReceivedPayload, EVT_REC_ERROR, EVT_REC_FINISH, EVT_REC_PROCESSING,
    EVT_TRANSCRIPTION_RECEIVED,
};
use crate::platform::Transcriber;
use enigo::{Enigo, Key, KeyboardControllable};
use serde::Serialize;
use std::{env, sync::Arc, thread, time::Duration};
use tauri::{Emitter, Manager};

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
