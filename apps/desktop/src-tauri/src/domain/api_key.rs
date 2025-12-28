use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub created_at: i64,
    pub salt: String,
    pub key_hash: String,
    pub key_ciphertext: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_suffix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcription_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_processing_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "openRouterConfig")]
    pub openrouter_config: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyCreateRequest {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyUpdateRequest {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcription_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_processing_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "openRouterConfig")]
    pub openrouter_config: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyView {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_suffix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_full: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcription_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_processing_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "openRouterConfig")]
    pub openrouter_config: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

impl From<ApiKey> for ApiKeyView {
    fn from(api_key: ApiKey) -> Self {
        Self {
            id: api_key.id,
            name: api_key.name,
            provider: api_key.provider,
            created_at: api_key.created_at,
            key_suffix: api_key.key_suffix,
            key_full: None,
            transcription_model: api_key.transcription_model,
            post_processing_model: api_key.post_processing_model,
            openrouter_config: api_key.openrouter_config,
            base_url: api_key.base_url,
        }
    }
}

impl ApiKeyView {
    pub fn with_full_key(mut self, key: Option<String>) -> Self {
        self.key_full = key;
        self
    }
}
