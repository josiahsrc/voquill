use crate::domain::{RecordingResult, TranscriptionReceivedPayload, EVT_TRANSCRIPTION_RECEIVED};
use crate::platform::Transcriber;
use enigo::{Enigo, Key, KeyboardControllable};
use std::{env, sync::Arc, thread, time::Duration};
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
