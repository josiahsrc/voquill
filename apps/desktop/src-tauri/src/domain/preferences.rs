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
    pub transcription_device: Option<String>,
    #[serde(default)]
    pub transcription_model_size: Option<String>,
    #[serde(default)]
    pub post_processing_mode: Option<String>,
    #[serde(default)]
    pub post_processing_api_key_id: Option<String>,
    #[serde(default)]
    pub post_processing_ollama_url: Option<String>,
    #[serde(default)]
    pub post_processing_ollama_model: Option<String>,
    #[serde(default)]
    pub agent_mode: Option<String>,
    #[serde(default)]
    pub agent_mode_api_key_id: Option<String>,
    #[serde(default)]
    pub openclaw_gateway_url: Option<String>,
    #[serde(default)]
    pub openclaw_token: Option<String>,
    #[serde(default)]
    pub active_tone_id: Option<String>,
    #[serde(default)]
    pub got_started_at: Option<i64>,
    #[serde(default)]
    pub gpu_enumeration_enabled: bool,
    #[serde(default)]
    pub paste_keybind: Option<String>,
    #[serde(default)]
    pub last_seen_feature: Option<String>,
    #[serde(default)]
    pub is_enterprise: bool,
    #[serde(default)]
    pub language_switch_enabled: bool,
    #[serde(default)]
    pub secondary_dictation_language: Option<String>,
    #[serde(default)]
    pub active_dictation_language: Option<String>,
    #[serde(default)]
    pub additional_dictation_languages: Option<Vec<String>>,
    #[serde(default)]
    pub preferred_microphone: Option<String>,
    #[serde(default)]
    pub ignore_update_dialog: bool,
    #[serde(default)]
    pub incognito_mode_enabled: bool,
    #[serde(default)]
    pub incognito_mode_include_in_stats: bool,
    #[serde(default = "default_dictation_pill_visibility")]
    pub dictation_pill_visibility: String,
    #[serde(default)]
    pub use_new_backend: bool,
}

fn default_dictation_pill_visibility() -> String {
    "while_active".to_string()
}
