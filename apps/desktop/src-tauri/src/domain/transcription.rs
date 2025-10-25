use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionAudioSnapshot {
    pub file_path: String,
    pub duration_ms: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transcription {
    pub id: String,
    pub transcript: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio: Option<TranscriptionAudioSnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inference_device: Option<String>,
}
