use crate::commands::AccessibilityInfo;

/// Get accessibility information about the currently focused text field.
/// Linux AT-SPI integration is not implemented for this POC.
pub fn get_accessibility_info() -> AccessibilityInfo {
    eprintln!("[linux::accessibility] Accessibility info not implemented for Linux");

    AccessibilityInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}
