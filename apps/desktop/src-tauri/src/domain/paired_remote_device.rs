use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedRemoteDevice {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub role: String,
    pub shared_secret: String,
    pub paired_at: String,
    #[serde(default)]
    pub last_seen_at: Option<String>,
    #[serde(default)]
    pub last_known_address: Option<String>,
    #[serde(default)]
    pub trusted: bool,
}
