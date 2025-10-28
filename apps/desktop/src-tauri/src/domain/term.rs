use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Term {
    pub id: String,
    pub created_at: i64,
    pub created_by_user_id: String,
    pub source_value: String,
    pub destination_value: String,
    pub is_replacement: bool,
    pub is_deleted: bool,
}
