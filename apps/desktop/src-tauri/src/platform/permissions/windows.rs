use crate::domain::{PermissionKind, PermissionState, PermissionStatus};

pub fn ensure_microphone_permission() -> Result<PermissionStatus, String> {
    Ok(PermissionStatus {
        kind: PermissionKind::Microphone,
        state: PermissionState::Authorized,
        prompt_shown: false,
    })
}

pub fn ensure_input_monitor_permission() -> Result<PermissionStatus, String> {
    Ok(PermissionStatus {
        kind: PermissionKind::InputMonitoring,
        state: PermissionState::Authorized,
        prompt_shown: false,
    })
}
