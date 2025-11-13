use std::env;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct GoogleOAuthConfig {
	pub client_id: String,
	pub client_secret: String,
}

impl GoogleOAuthConfig {
	pub fn from_env() -> Option<Self> {
		let client_id = env::var("VOQUILL_GOOGLE_CLIENT_ID").ok()?.trim().to_owned();
		let client_secret = env::var("VOQUILL_GOOGLE_CLIENT_SECRET").ok()?.trim().to_owned();

		if client_id.is_empty() || client_secret.is_empty() {
			return None;
		}

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
