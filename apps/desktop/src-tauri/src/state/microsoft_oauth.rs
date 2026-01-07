use std::env;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct MicrosoftOAuthConfig {
    pub client_id: String,
}

impl MicrosoftOAuthConfig {
    pub fn from_env() -> Option<Self> {
        let client_id = option_env!("VOQUILL_MICROSOFT_CLIENT_ID")
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().to_owned())
            .or_else(|| {
                env::var("VOQUILL_MICROSOFT_CLIENT_ID")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_owned())
            })?;

        Some(Self { client_id })
    }
}

struct MicrosoftOAuthStateInner {
    config: Option<MicrosoftOAuthConfig>,
}

#[derive(Clone)]
pub struct MicrosoftOAuthState {
    inner: Arc<MicrosoftOAuthStateInner>,
}

impl MicrosoftOAuthState {
    pub fn from_env() -> Self {
        Self {
            inner: Arc::new(MicrosoftOAuthStateInner {
                config: MicrosoftOAuthConfig::from_env(),
            }),
        }
    }

    pub fn config(&self) -> Option<&MicrosoftOAuthConfig> {
        self.inner.config.as_ref()
    }
}
