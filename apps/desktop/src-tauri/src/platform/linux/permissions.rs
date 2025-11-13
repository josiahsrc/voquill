use crate::domain::{PermissionKind, PermissionState, PermissionStatus};

pub(crate) fn check_microphone_permission() -> Result<PermissionStatus, String> {
    Ok(authorized_status(PermissionKind::Microphone))
}

pub(crate) fn request_microphone_permission() -> Result<PermissionStatus, String> {
    check_microphone_permission()
}

pub(crate) fn check_accessibility_permission() -> Result<PermissionStatus, String> {
    Ok(authorized_status(PermissionKind::Accessibility))
}

pub(crate) fn request_accessibility_permission() -> Result<PermissionStatus, String> {
    check_accessibility_permission()
}

fn authorized_status(kind: PermissionKind) -> PermissionStatus {
    PermissionStatus {
        kind,
        state: PermissionState::Authorized,
        prompt_shown: false,
    }
}
