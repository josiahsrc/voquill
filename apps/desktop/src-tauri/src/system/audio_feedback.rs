use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::sync::mpsc::{self, Sender};
use std::sync::OnceLock;
use std::thread;

static START_RECORDING_CLIP: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/audio/start-recording.wav"
));

static STOP_RECORDING_CLIP: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/audio/stop-recording.wav"
));

static LIMIT_REACHED_CLIP: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/audio/limit-reached.wav"
));

/// Channel sender for the warm audio thread.
static AUDIO_SENDER: OnceLock<Sender<AudioRequest>> = OnceLock::new();

enum AudioRequest {
    Play(&'static [u8]),
}

/// Initialize a dedicated audio thread at app startup for instant chime playback.
/// The thread keeps an OutputStream alive so we don't recreate it for each chime.
pub fn warm_audio_output() {
    let (tx, rx) = mpsc::channel::<AudioRequest>();

    // Store the sender for later use
    if AUDIO_SENDER.set(tx).is_err() {
        eprintln!("[audio] Audio sender already initialized");
        return;
    }

    // Spawn the dedicated audio thread
    thread::spawn(move || {
        // Create the output stream once and keep it alive
        let (_stream, handle) = match OutputStream::try_default() {
            Ok(result) => {
                eprintln!("[audio] Pre-warmed audio output stream");
                result
            }
            Err(err) => {
                eprintln!("[audio] Failed to create audio output: {err}");
                // Still process requests, but they'll fail gracefully
                for request in rx {
                    if let AudioRequest::Play(bytes) = request {
                        play_clip_fallback(bytes);
                    }
                }
                return;
            }
        };

        // Process play requests on this thread
        for request in rx {
            match request {
                AudioRequest::Play(bytes) => {
                    if let Ok(sink) = Sink::try_new(&handle) {
                        if let Ok(source) = Decoder::new(Cursor::new(bytes)) {
                            sink.append(source);
                            sink.sleep_until_end();
                        }
                    }
                }
            }
        }
    });
}

/// Try to send a play request to the warm audio thread.
fn try_warm_play(bytes: &'static [u8]) -> bool {
    if let Some(sender) = AUDIO_SENDER.get() {
        sender.send(AudioRequest::Play(bytes)).is_ok()
    } else {
        false
    }
}

pub fn play_start_recording_clip() {
    play_clip(START_RECORDING_CLIP);
}

pub fn play_stop_recording_clip() {
    play_clip(STOP_RECORDING_CLIP);
}

pub fn play_limit_reached_clip() {
    play_clip(LIMIT_REACHED_CLIP);
}

fn play_clip(bytes: &'static [u8]) {
    // Try the warm audio thread first (instant)
    if try_warm_play(bytes) {
        return;
    }

    // Fallback: spawn a new thread with its own stream
    play_clip_fallback(bytes);
}

fn play_clip_fallback(bytes: &'static [u8]) {
    thread::spawn(move || {
        if let Ok((stream, handle)) = OutputStream::try_default() {
            match Sink::try_new(&handle) {
                Ok(sink) => match Decoder::new(Cursor::new(bytes)) {
                    Ok(source) => {
                        sink.append(source);
                        sink.sleep_until_end();
                    }
                    Err(err) => {
                        eprintln!("Failed to decode audio clip: {err}");
                    }
                },
                Err(err) => {
                    eprintln!("Failed to create audio sink: {err}");
                }
            }

            drop(stream);
        } else {
            eprintln!("Failed to open default audio output stream");
        }
    });
}
