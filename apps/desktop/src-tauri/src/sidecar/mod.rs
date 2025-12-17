use serde::{Deserialize, Serialize};

pub const SIDECAR_ENV_PORT: &str = "VOQUILL_GPU_SIDECAR_PORT";
pub const SIDECAR_ENV_MODEL_PATH: &str = "VOQUILL_GPU_SIDECAR_MODEL_PATH";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscribeRequest {
    pub id: String,
    pub audio_path: String,
    pub language: Option<String>,
    pub initial_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscribeResponse {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl TranscribeResponse {
    pub fn success(id: String, result: String) -> Self {
        Self {
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: String, error: String) -> Self {
        Self {
            id,
            result: None,
            error: Some(error),
        }
    }
}
