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
    #[serde(default = "default_play_interaction_chime")]
    pub play_interaction_chime: bool,
}

const fn default_play_interaction_chime() -> bool {
    true
}
