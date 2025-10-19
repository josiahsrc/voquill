use serde::Serialize;
use std::time::Duration;

pub const EVT_ALT_PRESSED: &str = "alt-pressed";
pub const EVT_REC_START: &str = "recording-started";
pub const EVT_REC_FINISH: &str = "recording-finished";
pub const EVT_REC_ERROR: &str = "recording-error";
pub const EVT_REC_PROCESSING: &str = "recording-processing";
pub const EVT_REC_LEVEL: &str = "recording-level";

#[cfg(target_os = "macos")]
pub const LEFT_OPTION_KEYCODE: i64 = 58;
#[cfg(target_os = "macos")]
pub const RIGHT_OPTION_KEYCODE: i64 = 61;

#[derive(Clone, Debug)]
pub struct RecordingMetrics {
    pub duration: Duration,
    pub size_bytes: u64,
}

#[derive(Clone, Debug)]
pub struct RecordedAudio {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

#[derive(Clone, Debug)]
pub struct RecordingResult {
    pub metrics: RecordingMetrics,
    pub audio: RecordedAudio,
}

#[derive(Clone, Serialize)]
pub struct AltEventPayload {
    pub count: u64,
}

#[derive(Clone, Serialize)]
pub struct RecordingStartedPayload {
    pub started_at_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct RecordingFinishedPayload {
    pub duration_ms: u64,
    pub size_bytes: u64,
    pub transcription: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct RecordingProcessingPayload {
    pub duration_ms: u64,
    pub size_bytes: u64,
}

#[derive(Clone, Serialize)]
pub struct RecordingErrorPayload {
    pub message: String,
}

#[derive(Clone, Serialize)]
pub struct RecordingLevelPayload {
    pub levels: Vec<f32>,
}
