use crate::domain::{
    RecordingErrorPayload, RecordingFinishedPayload, RecordingResult, TranscriptionReceivedPayload,
    EVT_REC_ERROR, EVT_REC_FINISH, EVT_TRANSCRIPTION_RECEIVED,
};
use crate::platform::Transcriber;
use core_graphics::{
    event::CGEventTapLocation,
    event_source::{CGEventSource, CGEventSourceStateID},
};
use std::sync::Arc;
use tauri::{Emitter, EventTarget};

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

pub(crate) fn emit_recording_error(app: &tauri::AppHandle, message: String) {
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
