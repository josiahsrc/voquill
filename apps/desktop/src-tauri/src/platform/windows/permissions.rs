use crate::domain::{PermissionKind, PermissionState, PermissionStatus};

pub(crate) fn check_microphone_permission() -> Result<PermissionStatus, String> {
    Ok(authorized_status(PermissionKind::Microphone))
}

pub(crate) fn request_microphone_permission() -> Result<PermissionStatus, String> {
    check_microphone_permission()
}

pub(crate) fn check_input_monitoring_permission() -> Result<PermissionStatus, String> {
    Ok(authorized_status(PermissionKind::InputMonitoring))
}

pub(crate) fn request_input_monitoring_permission() -> Result<PermissionStatus, String> {
    check_input_monitoring_permission()
}

fn authorized_status(kind: PermissionKind) -> PermissionStatus {
    PermissionStatus {
        kind,
        state: PermissionState::Authorized,
        prompt_shown: false,
    }
}
