use std::sync::{Arc, Mutex};

use rand::{rngs::OsRng, RngCore};
use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::sync::watch;

#[derive(Clone, Debug, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoteReceiverStatus {
    pub enabled: bool,
    pub device_id: String,
    pub device_name: String,
    pub listen_address: Option<String>,
    pub port: Option<u16>,
    pub pairing_code: String,
    pub last_sender_device_id: Option<String>,
    pub last_event_id: Option<String>,
    pub last_delivery_status: Option<String>,
    pub last_delivery_at: Option<String>,
    pub last_error: Option<String>,
    pub last_target_class_name: Option<String>,
    pub last_target_title: Option<String>,
    pub last_target_editable: Option<bool>,
    pub device_platform: String,
}

struct RemoteReceiverStateInner {
    status: RemoteReceiverStatus,
    shutdown: Option<watch::Sender<bool>>,
}

#[derive(Clone)]
pub struct RemoteReceiverState {
    inner: Arc<Mutex<RemoteReceiverStateInner>>,
}

impl Default for RemoteReceiverState {
    fn default() -> Self {
        Self::new()
    }
}

impl RemoteReceiverState {
    pub fn new() -> Self {
        let device_name = hostname::get()
            .ok()
            .and_then(|value| value.into_string().ok())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "Voquill Desktop".to_string());

        let mut hasher = Sha256::new();
        hasher.update(device_name.as_bytes());
        let digest = hasher.finalize();
        let device_id = format!("device-{:x}", digest)[..23].to_string();

        Self {
            inner: Arc::new(Mutex::new(RemoteReceiverStateInner {
                status: RemoteReceiverStatus {
                    enabled: false,
                    device_id,
                    device_name,
                    listen_address: None,
                    port: None,
                    pairing_code: generate_pairing_code(),
                    last_sender_device_id: None,
                    last_event_id: None,
                    last_delivery_status: None,
                    last_delivery_at: None,
                    last_error: None,
                    last_target_class_name: None,
                    last_target_title: None,
                    last_target_editable: None,
                    device_platform: std::env::consts::OS.to_string(),
                },
                shutdown: None,
            })),
        }
    }

    pub fn status(&self) -> RemoteReceiverStatus {
        self.inner.lock().unwrap().status.clone()
    }

    pub fn is_enabled(&self) -> bool {
        self.inner.lock().unwrap().status.enabled
    }

    pub fn start(&self, listen_address: String, port: u16, shutdown: watch::Sender<bool>) {
        let mut inner = self.inner.lock().unwrap();
        inner.status.enabled = true;
        inner.status.listen_address = Some(listen_address);
        inner.status.port = Some(port);
        inner.status.pairing_code = generate_pairing_code();
        inner.shutdown = Some(shutdown);
    }

    pub fn stop(&self) {
        let mut inner = self.inner.lock().unwrap();
        if let Some(shutdown) = inner.shutdown.take() {
            let _ = shutdown.send(true);
        }
        inner.status.enabled = false;
        inner.status.listen_address = None;
        inner.status.port = None;
    }

    pub fn rotate_pairing_code(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.status.pairing_code = generate_pairing_code();
    }

    pub fn record_delivery(
        &self,
        sender_device_id: Option<String>,
        event_id: Option<String>,
        delivered_at: Option<String>,
        target_class_name: Option<String>,
        target_title: Option<String>,
        target_editable: Option<bool>,
    ) {
        let mut inner = self.inner.lock().unwrap();
        inner.status.last_sender_device_id = sender_device_id;
        inner.status.last_event_id = event_id;
        inner.status.last_delivery_status = Some("delivered".to_string());
        inner.status.last_delivery_at = delivered_at;
        inner.status.last_error = None;
        inner.status.last_target_class_name = target_class_name;
        inner.status.last_target_title = target_title;
        inner.status.last_target_editable = target_editable;
    }

    pub fn record_error(
        &self,
        sender_device_id: Option<String>,
        event_id: Option<String>,
        message: String,
        target_class_name: Option<String>,
        target_title: Option<String>,
        target_editable: Option<bool>,
    ) {
        let mut inner = self.inner.lock().unwrap();
        inner.status.last_sender_device_id = sender_device_id;
        inner.status.last_event_id = event_id;
        inner.status.last_delivery_status = Some("failed".to_string());
        inner.status.last_error = Some(message);
        inner.status.last_delivery_at = Some(chrono::Utc::now().to_rfc3339());
        inner.status.last_target_class_name = target_class_name;
        inner.status.last_target_title = target_title;
        inner.status.last_target_editable = target_editable;
    }
}

fn generate_pairing_code() -> String {
    let mut bytes = [0u8; 12];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}
