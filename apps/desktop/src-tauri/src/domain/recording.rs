use serde::Serialize;
use std::time::Duration;

pub const EVT_REC_LEVEL: &str = "recording_level";
pub const EVT_AUDIO_CHUNK: &str = "audio_chunk";

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
pub struct RecordingLevelPayload {
    pub levels: Vec<f32>,
}

#[derive(Clone, Serialize)]
pub struct AudioChunkPayload {
    pub samples: Vec<f32>,
}
