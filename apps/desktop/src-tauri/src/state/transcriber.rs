use std::sync::{Arc, OnceLock};

use crate::platform::Transcriber;

pub struct TranscriberState {
    inner: OnceLock<Arc<dyn Transcriber>>,
}

impl TranscriberState {
    pub fn new() -> Self {
        Self {
            inner: OnceLock::new(),
        }
    }

    pub fn new_initialized(transcriber: Arc<dyn Transcriber>) -> Self {
        let state = Self::new();
        let _ = state.inner.set(transcriber);
        state
    }

    pub fn get(&self) -> Option<&Arc<dyn Transcriber>> {
        self.inner.get()
    }

    pub fn initialize(&self, transcriber: Arc<dyn Transcriber>) -> Result<(), String> {
        self.inner
            .set(transcriber)
            .map_err(|_| "Transcriber already initialized".to_string())
    }

    pub fn is_initialized(&self) -> bool {
        self.inner.get().is_some()
    }
}

impl Default for TranscriberState {
    fn default() -> Self {
        Self::new()
    }
}
