use serde::{Deserialize, Serialize};

pub const EVT_OVERLAY_PHASE: &str = "overlay_phase";
pub const EVT_PILL_HOVER: &str = "pill_hover";

#[derive(Clone, Debug, Serialize)]
pub struct PillHoverPayload {
    pub hovered: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OverlayPhase {
    Idle,
    Recording,
    Loading,
}

#[derive(Clone, Debug, Serialize)]
pub struct OverlayPhasePayload {
    pub phase: OverlayPhase,
}

impl OverlayPhase {
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "idle" => Some(Self::Idle),
            "recording" => Some(Self::Recording),
            "loading" => Some(Self::Loading),
            _ => None,
        }
    }
}
