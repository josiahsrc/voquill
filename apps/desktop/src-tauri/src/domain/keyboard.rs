use serde::Serialize;

pub const EVT_KEYS_HELD: &str = "keys_held";

#[derive(Clone, Serialize)]
pub struct KeysHeldPayload {
    pub keys: Vec<String>,
}
