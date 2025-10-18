use rodio::{source::SineWave, OutputStream, Sink, Source};
use std::thread;
use std::time::Duration;

/// Plays a gentle, noticeable tone to indicate recording has started.
pub fn play_recording_start_tone() {
    play_tone(880.0, Duration::from_millis(200), 0.4);
}

/// Plays a gentle tone to indicate recording has stopped.
pub fn play_recording_stop_tone() {
    play_tone(660.0, Duration::from_millis(250), 0.4);
}

fn play_tone(frequency_hz: f32, duration: Duration, amplitude: f32) {
    thread::spawn(move || {
        if let Ok((stream, handle)) = OutputStream::try_default() {
            if let Ok(sink) = Sink::try_new(&handle) {
                let tone = SineWave::new(frequency_hz)
                    .take_duration(duration)
                    .fade_in(Duration::from_millis(25))
                    .amplify(amplitude);

                sink.append(tone);
                sink.sleep_until_end();
            }

            drop(stream);
        }
    });
}
