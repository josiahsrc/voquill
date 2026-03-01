use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::Mutex;
use uuid::Uuid;

use crate::models::WhisperModel;

#[derive(Debug, Clone)]
pub struct BufferedTranscriptionSession {
    pub model: WhisperModel,
    pub sample_rate: u32,
    pub language: Option<String>,
    pub initial_prompt: Option<String>,
    pub device_id: Option<String>,
    pub samples: Vec<f32>,
}

#[derive(Debug, Clone)]
pub struct BufferedTranscriptionSessionInput {
    pub model: WhisperModel,
    pub sample_rate: u32,
    pub language: Option<String>,
    pub initial_prompt: Option<String>,
    pub device_id: Option<String>,
}

#[derive(Default)]
struct SessionStore {
    sessions: HashMap<Uuid, BufferedTranscriptionSession>,
}

#[derive(Clone, Default)]
pub struct TranscriptionSessionRegistry {
    inner: Arc<Mutex<SessionStore>>,
}

impl TranscriptionSessionRegistry {
    pub async fn create(&self, input: BufferedTranscriptionSessionInput) -> Uuid {
        let session_id = Uuid::new_v4();
        let session = BufferedTranscriptionSession {
            model: input.model,
            sample_rate: input.sample_rate,
            language: input.language,
            initial_prompt: input.initial_prompt,
            device_id: input.device_id,
            samples: Vec::new(),
        };

        let mut store = self.inner.lock().await;
        store.sessions.insert(session_id, session);
        session_id
    }

    pub async fn append_samples(&self, session_id: Uuid, samples: Vec<f32>) -> Option<usize> {
        let mut store = self.inner.lock().await;
        let session = store.sessions.get_mut(&session_id)?;
        session.samples.extend(samples);
        Some(session.samples.len())
    }

    pub async fn take(&self, session_id: Uuid) -> Option<BufferedTranscriptionSession> {
        let mut store = self.inner.lock().await;
        store.sessions.remove(&session_id)
    }

    pub async fn remove(&self, session_id: Uuid) -> bool {
        let mut store = self.inner.lock().await;
        store.sessions.remove(&session_id).is_some()
    }
}
