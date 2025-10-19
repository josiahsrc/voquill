use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Transcription {
    pub id: String,
    pub transcript: String,
    pub timestamp: i64,
}
