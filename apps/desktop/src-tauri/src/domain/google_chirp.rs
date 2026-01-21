use serde::Serialize;

pub const EVT_GOOGLE_CHIRP_TRANSCRIPT: &str = "google_chirp_transcript";
pub const EVT_GOOGLE_CHIRP_ERROR: &str = "google_chirp_error";

#[derive(Clone, Serialize)]
pub struct GoogleChirpTranscriptPayload {
    pub text: String,
    pub is_final: bool,
}

#[derive(Clone, Serialize)]
pub struct GoogleChirpErrorPayload {
    pub error: String,
}
