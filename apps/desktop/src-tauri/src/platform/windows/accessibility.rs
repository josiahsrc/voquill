use crate::commands::AccessibilityInfo;
use windows::core::{Interface, BSTR};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED};
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationTextPattern, IUIAutomationValuePattern,
    UIA_TextPatternId, UIA_ValuePatternId,
};

/// Get accessibility information about the currently focused text field.
/// Uses Windows UI Automation to retrieve cursor position, selection length, and text content.
pub fn get_accessibility_info() -> AccessibilityInfo {
    match try_get_accessibility_info() {
        Ok(info) => info,
        Err(e) => {
            eprintln!("[windows::accessibility] Error getting accessibility info: {:?}", e);
            empty_info()
        }
    }
}

fn try_get_accessibility_info() -> Result<AccessibilityInfo, windows::core::Error> {
    unsafe {
        // Initialize COM (may already be initialized, that's ok)
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        // Create UI Automation instance
        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;

        // Get the focused element
        let focused = automation.GetFocusedElement()?;

        // Try to get the TextPattern
        let pattern = focused.GetCurrentPattern(UIA_TextPatternId)?;

        if pattern.as_raw().is_null() {
            eprintln!("[windows::accessibility] Focused element does not support TextPattern");
            return Ok(empty_info());
        }

        let text_pattern: IUIAutomationTextPattern = pattern.cast()?;

        // Get the document range for full text content
        let document_range = text_pattern.DocumentRange()?;
        let text_bstr: BSTR = document_range.GetText(-1)?;
        let text_content = Some(text_bstr.to_string());

        // Get selection ranges to determine cursor position and selection length
        let selections = text_pattern.GetSelection()?;
        let selection_count = selections.Length()?;

        let (cursor_position, selection_length) = if selection_count > 0 {
            let selection = selections.GetElement(0)?;

            // Get the text of the selection to determine selection length
            let selection_text: BSTR = selection.GetText(-1)?;
            let sel_len = selection_text.to_string().len();

            // To get cursor position, we compare selection start with document start
            // Clone the document range and move its end to the selection start
            let doc_start = document_range.Clone()?;

            // Move document range end to match selection start
            // TextPatternRangeEndpoint::End = 1, TextPatternRangeEndpoint::Start = 0
            doc_start.MoveEndpointByRange(
                windows::Win32::UI::Accessibility::TextPatternRangeEndpoint_End,
                &selection,
                windows::Win32::UI::Accessibility::TextPatternRangeEndpoint_Start,
            )?;

            let cursor_text: BSTR = doc_start.GetText(-1)?;
            let cursor_pos = cursor_text.to_string().len();

            (Some(cursor_pos), Some(sel_len))
        } else {
            // No selection - try to get caret position another way
            (None, Some(0))
        };

        eprintln!(
            "[windows::accessibility] Retrieved: cursor={:?}, selection_len={:?}, text_len={:?}",
            cursor_position,
            selection_length,
            text_content.as_ref().map(|s| s.len())
        );

        Ok(AccessibilityInfo {
            cursor_position,
            selection_length,
            text_content,
            screen_context: None,
        })
    }
}

fn empty_info() -> AccessibilityInfo {
    AccessibilityInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
        screen_context: None,
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
