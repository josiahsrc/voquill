use serde::{Deserialize, Serialize};

pub const EVT_OVERLAY_PHASE: &str = "overlay_phase";

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

impl std::str::FromStr for OverlayPhase {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "idle" => Ok(Self::Idle),
            "recording" => Ok(Self::Recording),
            "loading" => Ok(Self::Loading),
            _ => {
                // if allow to ignore Upper or Lower Case , add follow
                let s_lower = s.to_ascii_lowercase();
                match s_lower.as_str() {
                    "idle" => Ok(Self::Idle),
                    "recording" => Ok(Self::Recording),
                    "loading" => Ok(Self::Loading),
                    _ => Err(()),
                }
            }
        }
    }
}
