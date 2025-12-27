use serde::{Deserialize, Serialize};

pub const EVT_REGISTER_CURRENT_APP: &str = "voquill:register-current-app";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppTarget {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub tone_id: Option<String>,
    pub icon_path: Option<String>,
    #[serde(default)]
    pub paste_keybind: Option<String>,
}
