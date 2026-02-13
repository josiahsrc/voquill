use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub name: String,
    pub bio: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    pub onboarded: bool,
    #[serde(default)]
    pub preferred_microphone: Option<String>,
    #[serde(default)]
    pub preferred_language: Option<String>,
    #[serde(default)]
    pub words_this_month: i64,
    #[serde(default)]
    pub words_this_month_month: Option<String>,
    #[serde(default)]
    pub words_total: i64,
    #[serde(default = "default_play_interaction_chime")]
    pub play_interaction_chime: bool,
    #[serde(default)]
    pub has_finished_tutorial: bool,
    #[serde(default)]
    pub has_migrated_preferred_microphone: bool,
    #[serde(default)]
    pub cohort: Option<String>,
    #[serde(default)]
    pub styling_mode: Option<String>,
    #[serde(default)]
    pub selected_tone_id: Option<String>,
    #[serde(default)]
    pub active_tone_ids: Option<String>,
    #[serde(default)]
    pub streak: Option<i64>,
    #[serde(default)]
    pub streak_recorded_at: Option<String>,
}

const fn default_play_interaction_chime() -> bool {
    true
}
