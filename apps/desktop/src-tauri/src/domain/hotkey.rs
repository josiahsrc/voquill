use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hotkey {
    pub id: String,
    pub action_name: String,
    pub keys: Vec<String>,
}
