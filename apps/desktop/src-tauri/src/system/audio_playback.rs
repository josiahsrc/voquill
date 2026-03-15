use rodio::{buffer::SamplesBuffer, OutputStream, Sink};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::OnceLock;
use std::thread;

static AUDIO_PLAYBACK_SENDER: OnceLock<Sender<AudioPlaybackRequest>> = OnceLock::new();

enum AudioPlaybackRequest {
    Play {
        samples: Vec<f32>,
        sample_rate: u32,
        respond_to: Sender<Result<(), String>>,
    },
    Stop {
        respond_to: Sender<Result<(), String>>,
    },
    Pause {
        respond_to: Sender<Result<(), String>>,
    },
    Resume {
        respond_to: Sender<Result<(), String>>,
    },
}

fn playback_sender() -> &'static Sender<AudioPlaybackRequest> {
    AUDIO_PLAYBACK_SENDER.get_or_init(|| {
        let (sender, receiver) = mpsc::channel();
        thread::spawn(move || run_audio_playback_loop(receiver));
        sender
    })
}

fn run_audio_playback_loop(receiver: Receiver<AudioPlaybackRequest>) {
    let mut active_playback: Option<(OutputStream, Sink)> = None;

    for request in receiver {
        match request {
            AudioPlaybackRequest::Play {
                samples,
                sample_rate,
                respond_to,
            } => {
                if let Some((_, sink)) = active_playback.take() {
                    sink.stop();
                }

                let result = if sample_rate == 0 {
                    Err("Audio sample rate must be greater than 0".to_string())
                } else if samples.is_empty() {
                    Err("Audio buffer is empty".to_string())
                } else {
                    match OutputStream::try_default() {
                        Ok((stream, handle)) => match Sink::try_new(&handle) {
                            Ok(sink) => {
                                sink.append(SamplesBuffer::new(1, sample_rate, samples));
                                sink.play();
                                active_playback = Some((stream, sink));
                                Ok(())
                            }
                            Err(err) => Err(format!("Failed to create audio sink: {err}")),
                        },
                        Err(err) => {
                            Err(format!("Failed to open default audio output stream: {err}"))
                        }
                    }
                };

                let _ = respond_to.send(result);
            }
            AudioPlaybackRequest::Stop { respond_to } => {
                if let Some((_, sink)) = active_playback.take() {
                    sink.stop();
                }
                let _ = respond_to.send(Ok(()));
            }
            AudioPlaybackRequest::Pause { respond_to } => {
                if let Some((_, sink)) = active_playback.as_ref() {
                    sink.pause();
                }
                let _ = respond_to.send(Ok(()));
            }
            AudioPlaybackRequest::Resume { respond_to } => {
                if let Some((_, sink)) = active_playback.as_ref() {
                    sink.play();
                }
                let _ = respond_to.send(Ok(()));
            }
        }
    }
}

fn send_request(
    build: impl FnOnce(Sender<Result<(), String>>) -> AudioPlaybackRequest,
) -> Result<(), String> {
    let (respond_to, response_rx) = mpsc::channel();
    playback_sender()
        .send(build(respond_to))
        .map_err(|_| "Audio playback thread is unavailable".to_string())?;
    response_rx
        .recv()
        .map_err(|_| "Audio playback thread did not respond".to_string())?
}

pub fn play_samples(samples: Vec<f32>, sample_rate: u32) -> Result<(), String> {
    send_request(|respond_to| AudioPlaybackRequest::Play {
        samples,
        sample_rate,
        respond_to,
    })
}

pub fn stop_playback() -> Result<(), String> {
    send_request(|respond_to| AudioPlaybackRequest::Stop { respond_to })
}

pub fn pause_playback() -> Result<(), String> {
    send_request(|respond_to| AudioPlaybackRequest::Pause { respond_to })
}

pub fn resume_playback() -> Result<(), String> {
    send_request(|respond_to| AudioPlaybackRequest::Resume { respond_to })
}
