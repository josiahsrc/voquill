use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppTarget {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub tone_id: Option<String>,
    pub icon_path: Option<String>,
}
