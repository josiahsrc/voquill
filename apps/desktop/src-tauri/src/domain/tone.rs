use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Tone {
    pub id: String,
    pub name: String,
    pub prompt_template: String,
    pub created_at: i64,
    pub sort_order: i32,
}
