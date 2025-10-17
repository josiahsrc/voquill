use serde::{Deserialize, Serialize};

pub const EVT_TRANSCRIPTION_RECEIVED: &str = "transcription_received";

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Transcription {
    pub id: String,
    pub transcript: String,
    pub timestamp: i64,
}

#[derive(Clone, Debug, Serialize)]
pub struct TranscriptionReceivedPayload {
    pub text: String,
}
