use serde::{Deserialize, Serialize};

pub const EVT_TOAST: &str = "toast";

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ToastType {
    Info,
    Error,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Toast {
    pub id: String,
    pub title: String,
    pub message: String,
    pub toast_type: ToastType,
}

#[derive(Clone, Debug, Serialize)]
pub struct ToastPayload {
    pub toast: Toast,
}
