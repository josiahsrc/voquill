use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub user_id: String,
    #[serde(default)]
    pub transcription_mode: Option<String>,
    #[serde(default)]
    pub transcription_api_key_id: Option<String>,
    #[serde(default)]
    pub post_processing_mode: Option<String>,
    #[serde(default)]
    pub post_processing_api_key_id: Option<String>,
}
