use std::sync::Arc;
use tokio::sync::Mutex;

use crate::platform::google_speech::GoogleChirpSession;

pub struct GoogleChirpState {
    session: Arc<Mutex<Option<GoogleChirpSession>>>,
}

impl GoogleChirpState {
    pub fn new() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_session(&self, session: GoogleChirpSession) {
        let mut guard = self.session.lock().await;
        *guard = Some(session);
    }

    pub async fn take_session(&self) -> Option<GoogleChirpSession> {
        let mut guard = self.session.lock().await;
        guard.take()
    }

    pub async fn with_session<F, R>(&self, f: F) -> Option<R>
    where
        F: FnOnce(&GoogleChirpSession) -> R,
    {
        let guard = self.session.lock().await;
        guard.as_ref().map(f)
    }

    pub fn session_arc(&self) -> Arc<Mutex<Option<GoogleChirpSession>>> {
        self.session.clone()
    }
}

impl Default for GoogleChirpState {
    fn default() -> Self {
        Self::new()
    }
}
