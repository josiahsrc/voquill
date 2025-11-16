use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tone {
    pub id: String,
    pub name: String,
    pub prompt_template: String,
    pub is_system: bool,
    pub created_at: i64,
    pub sort_order: i32,
}

impl Tone {
    /// Create a system tone with a specific ID (for default tones)
    pub fn new_system(id: String, name: String, prompt_template: String, sort_order: i32) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        Self {
            id,
            name,
            prompt_template,
            is_system: true,
            created_at: now,
            sort_order,
        }
    }
}
