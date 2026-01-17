use serde::Serialize;

pub const EVT_KEYS_HELD: &str = "keys_held";
pub const EVT_MOUSE_CLICK: &str = "global-mouse-click";

#[derive(Clone, Serialize)]
pub struct KeysHeldPayload {
    pub keys: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct MouseClickPayload {
    pub button: String,
}
