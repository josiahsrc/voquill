use crate::commands::{ScreenContextInfo, TextFieldInfo};
use windows::core::{Interface, BSTR};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED};
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationTextPattern, IUIAutomationValuePattern,
    UIA_TextPatternId, UIA_ValuePatternId,
};

fn empty_text_field_info() -> TextFieldInfo {
    TextFieldInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}

pub fn get_text_field_info() -> TextFieldInfo {
    match try_get_text_field_info() {
        Ok(info) => info,
        Err(e) => {
            eprintln!("[windows::accessibility] Error getting text field info: {:?}", e);
            empty_text_field_info()
        }
    }
}

fn try_get_text_field_info() -> Result<TextFieldInfo, windows::core::Error> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;

        let focused = automation.GetFocusedElement()?;

        let pattern = focused.GetCurrentPattern(UIA_TextPatternId)?;

        if pattern.as_raw().is_null() {
            eprintln!("[windows::accessibility] Focused element does not support TextPattern");
            return Ok(empty_text_field_info());
        }

        let text_pattern: IUIAutomationTextPattern = pattern.cast()?;

        let document_range = text_pattern.DocumentRange()?;
        let text_bstr: BSTR = document_range.GetText(-1)?;
        let text_content = Some(text_bstr.to_string());

        let selections = text_pattern.GetSelection()?;
        let selection_count = selections.Length()?;

        let (cursor_position, selection_length) = if selection_count > 0 {
            let selection = selections.GetElement(0)?;

            let selection_text: BSTR = selection.GetText(-1)?;
            let sel_len = selection_text.to_string().len();

            let doc_start = document_range.Clone()?;

            doc_start.MoveEndpointByRange(
                windows::Win32::UI::Accessibility::TextPatternRangeEndpoint_End,
                &selection,
                windows::Win32::UI::Accessibility::TextPatternRangeEndpoint_Start,
            )?;

            let cursor_text: BSTR = doc_start.GetText(-1)?;
            let cursor_pos = cursor_text.to_string().len();

            (Some(cursor_pos), Some(sel_len))
        } else {
            (None, Some(0))
        };

        Ok(TextFieldInfo {
            cursor_position,
            selection_length,
            text_content,
        })
    }
}

pub fn get_screen_context() -> ScreenContextInfo {
    ScreenContextInfo { screen_context: None }
}

pub fn get_selected_text() -> Option<String> {
    try_get_selected_text().ok().flatten()
}

fn try_get_selected_text() -> Result<Option<String>, windows::core::Error> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;

        let focused = automation.GetFocusedElement()?;

        let pattern = focused.GetCurrentPattern(UIA_TextPatternId)?;

        if pattern.as_raw().is_null() {
            return Ok(None);
        }

        let text_pattern: IUIAutomationTextPattern = pattern.cast()?;

        let selections = text_pattern.GetSelection()?;
        let selection_count = selections.Length()?;

        if selection_count > 0 {
            let selection = selections.GetElement(0)?;
            let selection_text: BSTR = selection.GetText(-1)?;
            let text = selection_text.to_string();
            if !text.is_empty() {
                return Ok(Some(text));
            }
        }

        Ok(None)
    }
}

pub fn set_text_field_value(value: &str) -> Result<(), String> {
    try_set_text_field_value(value).map_err(|e| format!("Failed to set text field value: {:?}", e))
}

fn try_set_text_field_value(value: &str) -> Result<(), windows::core::Error> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;

        let focused = automation.GetFocusedElement()?;

        let pattern = focused.GetCurrentPattern(UIA_ValuePatternId)?;

        if pattern.as_raw().is_null() {
            return Err(windows::core::Error::new(
                windows::core::HRESULT(-1),
                "Focused element does not support ValuePattern",
            ));
        }

        let value_pattern: IUIAutomationValuePattern = pattern.cast()?;
        value_pattern.SetValue(&BSTR::from(value))?;

        Ok(())
    }
}
