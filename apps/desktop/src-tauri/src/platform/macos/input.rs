use crate::domain::{RecordingResult, TranscriptionReceivedPayload, EVT_TRANSCRIPTION_RECEIVED};
use crate::platform::Transcriber;
use core_graphics::event::CGEventTapLocation;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::sync::Arc;
use tauri::{Emitter, EventTarget};

pub(crate) fn handle_recording_success(
    emit_handle: tauri::AppHandle,
    transcriber: Arc<dyn Transcriber>,
    result: RecordingResult,
) {
    let samples = result.audio.samples;
    let sample_rate = result.audio.sample_rate;
    let emit_transcription = emit_handle.clone();

    std::thread::spawn(move || {
        let transcription_result = transcriber.transcribe(&samples, sample_rate);

        let mut transcription: Option<String> = None;
        if let Err(err) = transcription_result.as_ref() {
            eprintln!("Transcription failed: {err}");
        }

        if let Ok(text) = transcription_result {
            let normalized = text.trim().to_string();
            if !normalized.is_empty() {
                transcription = Some(normalized);
            }
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
