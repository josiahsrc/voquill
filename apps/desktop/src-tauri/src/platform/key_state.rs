use crate::domain::{KeysHeldPayload, EVT_KEYS_HELD};
use rdev::Key as RdevKey;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, EventTarget};

pub(crate) type PressedKeys = Arc<Mutex<HashSet<String>>>;

pub(crate) fn new_pressed_keys_state() -> PressedKeys {
    Arc::new(Mutex::new(HashSet::new()))
}

pub(crate) fn update_pressed_keys_state(
    state: &PressedKeys,
    key: RdevKey,
    is_pressed: bool,
) -> Option<Vec<String>> {
    let key_label = key_to_label(key);
    let mut guard = state
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let changed = if is_pressed {
        guard.insert(key_label.clone())
    } else {
        guard.remove(&key_label)
    };

    if changed {
        let snapshot = guard.iter().cloned().collect::<Vec<String>>();
        Some(snapshot)
    } else {
        None
    }
}

pub(crate) fn emit_keys_snapshot(app: &AppHandle, mut keys: Vec<String>) {
    keys.sort_unstable();
    let payload = KeysHeldPayload { keys };
    if let Err(err) = app.emit_to(EventTarget::any(), EVT_KEYS_HELD, payload) {
        eprintln!("Failed to emit keys-held event: {err}");
    }
}

fn key_to_label(key: RdevKey) -> String {
    match key {
        RdevKey::Unknown(code) => format!("Unknown({code})"),
        _ => format!("{key:?}"),
    }
}
