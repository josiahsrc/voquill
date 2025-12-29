use std::env;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct GoogleOAuthConfig {
    pub client_id: String,
    pub client_secret: String,
}

impl GoogleOAuthConfig {
    pub fn from_env() -> Option<Self> {
        // Try compile-time env vars first (embedded during CI builds),
        // then fall back to runtime env vars (for local development).
        let client_id = option_env!("VOQUILL_GOOGLE_CLIENT_ID")
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().to_owned())
            .or_else(|| {
                env::var("VOQUILL_GOOGLE_CLIENT_ID")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_owned())
            })?;

        let client_secret = option_env!("VOQUILL_GOOGLE_CLIENT_SECRET")
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().to_owned())
            .or_else(|| {
                env::var("VOQUILL_GOOGLE_CLIENT_SECRET")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_owned())
            })?;

        Some(Self {
            client_id,
            client_secret,
        })
    }
}

struct GoogleOAuthStateInner {
    config: Option<GoogleOAuthConfig>,
}

#[derive(Clone)]
pub struct GoogleOAuthState {
    inner: Arc<GoogleOAuthStateInner>,
}

impl GoogleOAuthState {
    pub fn from_env() -> Self {
        Self {
            inner: Arc::new(GoogleOAuthStateInner {
                config: GoogleOAuthConfig::from_env(),
            }),
        }
    }

    pub fn config(&self) -> Option<&GoogleOAuthConfig> {
        self.inner.config.as_ref()
    }
}
