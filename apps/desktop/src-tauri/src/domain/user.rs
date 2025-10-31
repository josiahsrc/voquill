use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub name: String,
    pub bio: String,
    pub onboarded: bool,
    #[serde(default)]
    pub preferred_microphone: Option<String>,
    #[serde(default)]
    pub words_this_month: i64,
    #[serde(default)]
    pub words_this_month_month: Option<String>,
    #[serde(default)]
    pub words_total: i64,
    #[serde(default = "default_play_interaction_chime")]
    pub play_interaction_chime: bool,
    #[serde(default)]
    pub preferred_transcription_mode: Option<String>,
    #[serde(default)]
    pub preferred_transcription_api_key_id: Option<String>,
    #[serde(default)]
    pub preferred_post_processing_mode: Option<String>,
    #[serde(default)]
    pub preferred_post_processing_api_key_id: Option<String>,
}

const fn default_play_interaction_chime() -> bool {
    true
}
