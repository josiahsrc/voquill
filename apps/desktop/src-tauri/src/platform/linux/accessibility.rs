use crate::commands::{ScreenContextInfo, TextFieldInfo};

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

pub fn get_selected_text() -> Option<String> {
    if super::detect::is_wayland() {
        super::wl::accessibility::get_selected_text()
    } else {
        super::x11::accessibility::get_selected_text()
    }
}
