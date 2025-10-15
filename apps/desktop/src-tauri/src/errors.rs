use cpal::SampleFormat;

#[derive(thiserror::Error, Debug)]
pub enum RecordingError {
    #[error("already recording")]
    AlreadyRecording,
    #[error("no input device")]
    InputDeviceUnavailable,
    #[error("stream config: {0}")]
    StreamConfig(String),
    #[error("stream build: {0}")]
    StreamBuild(String),
    #[error("stream play: {0}")]
    StreamPlay(String),
    #[error("not recording")]
    NotRecording,
    #[error("unsupported format: {0:?}")]
    UnsupportedFormat(SampleFormat),
}
