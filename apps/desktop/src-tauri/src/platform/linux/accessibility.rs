use crate::commands::{
    AccessibilityDumpResult, FieldValueRequest, FieldValueResult, ScreenContextInfo, TextFieldInfo,
};

pub fn get_text_field_info() -> TextFieldInfo {
    log::warn!("Text field info not implemented for Linux");

    TextFieldInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}

pub fn get_screen_context() -> ScreenContextInfo {
    log::warn!("Screen context not implemented for Linux");

    ScreenContextInfo {
        screen_context: None,
    }
}

pub fn gather_accessibility_dump() -> AccessibilityDumpResult {
    log::warn!("gather_accessibility_dump not implemented for Linux");
    AccessibilityDumpResult {
        dump: None,
        window_title: None,
        process_name: None,
        element_count: 0,
    }
}

pub fn get_focused_field_info() -> Option<crate::commands::AccessibilityFieldInfo> {
    log::warn!("get_focused_field_info not implemented for Linux");
    None
}

pub fn focus_accessibility_field(
    _app_pid: i32,
    _element_index_path: &[usize],
    _fingerprint_chain: Option<&[crate::commands::ElementFingerprint]>,
    _backend: Option<&str>,
    _jab_string_path: Option<&[crate::commands::JabElementId]>,
) -> Result<(), String> {
    Err("Not implemented for Linux".to_string())
}

pub fn write_accessibility_fields(
    _entries: Vec<crate::commands::AccessibilityWriteEntry>,
) -> crate::commands::AccessibilityWriteResult {
    log::warn!("write_accessibility_fields not implemented for Linux");
    crate::commands::AccessibilityWriteResult {
        succeeded: 0,
        failed: 0,
        errors: vec!["Not implemented for Linux".to_string()],
    }
}

pub fn read_field_values(fields: Vec<FieldValueRequest>) -> Vec<FieldValueResult> {
    fields
        .iter()
        .map(|_| FieldValueResult {
            value: None,
            error: Some("Not implemented for Linux".to_string()),
        })
        .collect()
}

pub fn resolve_app_pids(
    _identity: &crate::commands::AppIdentity,
) -> Vec<crate::commands::AppProcessMatch> {
    log::warn!("resolve_app_pids not implemented for Linux");
    Vec::new()
}

pub fn check_focused_paste_target() -> crate::commands::PasteTargetState {
    crate::commands::PasteTargetState::Unknown
}

pub fn get_selected_text() -> Option<String> {
    if super::detect::is_wayland() {
        super::wl::accessibility::get_selected_text()
    } else {
        super::x11::accessibility::get_selected_text()
    }
}
