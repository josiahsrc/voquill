use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::thread;

static START_RECORDING_CLIP: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/audio/start-recording.wav"
));

static STOP_RECORDING_CLIP: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/assets/audio/stop-recording.wav"
));

pub fn play_start_recording_clip() {
    play_clip(START_RECORDING_CLIP);
}

pub fn play_stop_recording_clip() {
    play_clip(STOP_RECORDING_CLIP);
}

fn play_clip(bytes: &'static [u8]) {
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
