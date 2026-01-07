use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token_ciphertext: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token_ciphertext: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_expires_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerView {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub created_at: i64,
    pub is_authenticated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_expires_at: Option<i64>,
}

impl From<McpServer> for McpServerView {
    fn from(server: McpServer) -> Self {
        let is_authenticated = server.access_token_ciphertext.is_some();
        Self {
            id: server.id,
            provider: server.provider,
            name: server.name,
            url: server.url,
            enabled: server.enabled,
            created_at: server.created_at,
            is_authenticated,
            token_expires_at: server.token_expires_at,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerCreateRequest {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub url: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerUpdateRequest {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
}
