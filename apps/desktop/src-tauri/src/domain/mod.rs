pub mod hotkey;
pub mod keyboard;
pub mod overlay;
pub mod permissions;
pub mod recording;
pub mod term;
pub mod transcription;
pub mod user;

pub use hotkey::Hotkey;
pub use keyboard::{KeysHeldPayload, EVT_KEYS_HELD};
pub use overlay::{OverlayPhase, OverlayPhasePayload, EVT_OVERLAY_PHASE};
pub use permissions::{PermissionKind, PermissionState, PermissionStatus};
pub use recording::{
    RecordedAudio, RecordingLevelPayload, RecordingMetrics, RecordingResult, EVT_REC_LEVEL,
};
pub use term::Term;
pub use transcription::{Transcription, TranscriptionAudioSnapshot};
pub use user::User;
