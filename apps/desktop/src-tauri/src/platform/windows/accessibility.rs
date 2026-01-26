use crate::commands::{ScreenContextInfo, TextFieldInfo};
use std::collections::HashSet;
use windows::core::{Interface, BSTR};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
};
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationTextPattern,
    IUIAutomationTreeWalker, IUIAutomationValuePattern, TreeScope_Children,
    UIA_ControlTypePropertyId, UIA_DataItemControlTypeId, UIA_HeaderControlTypeId,
    UIA_HelpTextPropertyId, UIA_HyperlinkControlTypeId, UIA_ListItemControlTypeId,
    UIA_MenuBarControlTypeId, UIA_MenuControlTypeId, UIA_MenuItemControlTypeId,
    UIA_NamePropertyId, UIA_StatusBarControlTypeId, UIA_TabControlTypeId,
    UIA_TextControlTypeId, UIA_TextPatternId, UIA_ToolBarControlTypeId,
    UIA_TreeItemControlTypeId, UIA_ValuePatternId, UIA_WindowControlTypeId,
    UIA_ButtonControlTypeId, UIA_CheckBoxControlTypeId, UIA_ComboBoxControlTypeId,
    UIA_DocumentControlTypeId, UIA_GroupControlTypeId,
    UIA_ListControlTypeId, UIA_PaneControlTypeId, UIA_RadioButtonControlTypeId,
    UIA_TableControlTypeId, UIA_TreeControlTypeId, UIA_DataGridControlTypeId,
    UIA_CustomControlTypeId, UIA_SplitButtonControlTypeId, UIA_SliderControlTypeId,
    UIA_SpinnerControlTypeId, UIA_ProgressBarControlTypeId, UIA_TabItemControlTypeId,
    UIA_TitleBarControlTypeId, UIA_HeaderItemControlTypeId, UIA_ThumbControlTypeId,
    UIA_ImageControlTypeId, UIA_CalendarControlTypeId, UIA_SemanticZoomControlTypeId,
    UIA_AppBarControlTypeId,
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
    match try_get_screen_context() {
        Ok(info) => info,
        Err(e) => {
            eprintln!("[windows::accessibility] Error getting screen context: {:?}", e);
            ScreenContextInfo { screen_context: None }
        }
    }
}

const MAX_CONTEXT_LENGTH: usize = 12000;
const MAX_LEVELS_UP: usize = 20;
const MAX_SIBLINGS: i32 = 80;
const MAX_RECURSION_DEPTH: usize = 8;

fn try_get_screen_context() -> Result<ScreenContextInfo, windows::core::Error> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;

        let focused = automation.GetFocusedElement()?;
        let tree_walker = automation.ControlViewWalker()?;

        let context = gather_context_outward(&automation, &tree_walker, &focused)?;
        let screen_context = if context.is_empty() {
            None
        } else {
            Some(context)
        };

        Ok(ScreenContextInfo { screen_context })
    }
}

unsafe fn gather_context_outward(
    automation: &IUIAutomation,
    tree_walker: &IUIAutomationTreeWalker,
    focused_element: &IUIAutomationElement,
) -> Result<String, windows::core::Error> {
    let mut texts: Vec<String> = Vec::new();

    let focused_control_type = get_control_type(focused_element);
    let focused_texts = extract_text_from_element(focused_element, focused_control_type)?;
    texts.extend(focused_texts);

    let mut current_element = focused_element.clone();
    let mut levels_up = 0;

    while levels_up < MAX_LEVELS_UP {
        let parent = match tree_walker.GetParentElement(&current_element) {
            Ok(p) => p,
            Err(_) => break,
        };

        let control_type = get_control_type(&parent);

        if control_type == UIA_WindowControlTypeId.0 {
            if let Some(name) = get_element_name(&parent) {
                let t = name.trim();
                if !t.is_empty() {
                    texts.push(format!("[Window: {}]", t));
                }
            }
            break;
        }

        if let Some(name) = get_element_name(&parent) {
            let t = name.trim();
            if !t.is_empty() && t.len() > 1 {
                texts.push(t.to_string());
            }
        }

        if let Ok(children) = parent.FindAll(TreeScope_Children, &automation.CreateTrueCondition()?)
        {
            let count = children.Length()?.min(MAX_SIBLINGS);
            for i in 0..count {
                if let Ok(sibling) = children.GetElement(i) {
                    let sibling_texts =
                        extract_text_recursive(automation, &sibling, 0, MAX_RECURSION_DEPTH)?;
                    texts.extend(sibling_texts);

                    let current_len: usize = texts.iter().map(|s| s.len()).sum();
                    if current_len > MAX_CONTEXT_LENGTH {
                        break;
                    }
                }
            }
        }

        let current_len: usize = texts.iter().map(|s| s.len()).sum();
        if current_len > MAX_CONTEXT_LENGTH {
            break;
        }

        current_element = parent;
        levels_up += 1;
    }

    let mut seen = HashSet::new();
    let unique_texts: Vec<String> = texts
        .into_iter()
        .filter(|s| seen.insert(s.clone()))
        .collect();

    Ok(unique_texts.join("\n"))
}

unsafe fn extract_text_recursive(
    automation: &IUIAutomation,
    element: &IUIAutomationElement,
    depth: usize,
    max_depth: usize,
) -> Result<Vec<String>, windows::core::Error> {
    if depth > max_depth {
        return Ok(Vec::new());
    }

    let mut texts = Vec::new();
    let control_type = get_control_type(element);

    if should_skip_control_type(control_type) {
        return Ok(texts);
    }

    let element_texts = extract_text_from_element(element, control_type)?;
    texts.extend(element_texts);

    if is_container_control_type(control_type) {
        if let Ok(children) =
            element.FindAll(TreeScope_Children, &automation.CreateTrueCondition()?)
        {
            let count = children.Length()?.min(30);
            for i in 0..count {
                if let Ok(child) = children.GetElement(i) {
                    let child_texts =
                        extract_text_recursive(automation, &child, depth + 1, max_depth)?;
                    texts.extend(child_texts);
                }
            }
        }
    }

    Ok(texts)
}

unsafe fn extract_text_from_element(
    element: &IUIAutomationElement,
    control_type: i32,
) -> Result<Vec<String>, windows::core::Error> {
    let mut texts = Vec::new();

    if let Some(name) = get_element_name(element) {
        let t = name.trim();
        if !t.is_empty() && t.len() < 500 {
            texts.push(t.to_string());
        }
    }

    let value_safe_types = [
        UIA_TextControlTypeId.0,
        UIA_HyperlinkControlTypeId.0,
        UIA_DataItemControlTypeId.0,
        UIA_ListItemControlTypeId.0,
        UIA_TreeItemControlTypeId.0,
        UIA_MenuItemControlTypeId.0,
        UIA_ButtonControlTypeId.0,
        UIA_CheckBoxControlTypeId.0,
        UIA_RadioButtonControlTypeId.0,
        UIA_ComboBoxControlTypeId.0,
        UIA_TabItemControlTypeId.0,
        UIA_HeaderItemControlTypeId.0,
        UIA_SplitButtonControlTypeId.0,
        UIA_SliderControlTypeId.0,
        UIA_SpinnerControlTypeId.0,
        UIA_ProgressBarControlTypeId.0,
    ];

    if value_safe_types.contains(&control_type) {
        if let Some(value) = get_element_value(element) {
            let t = value.trim();
            if !t.is_empty() && t.len() < 500 && !texts.contains(&t.to_string()) {
                texts.push(t.to_string());
            }
        }
    }

    if let Some(help_text) = get_element_help_text(element) {
        let t = help_text.trim();
        if !t.is_empty() && t.len() < 500 && !texts.contains(&t.to_string()) {
            texts.push(t.to_string());
        }
    }

    Ok(texts)
}

fn get_control_type(element: &IUIAutomationElement) -> i32 {
    unsafe {
        element
            .GetCurrentPropertyValue(UIA_ControlTypePropertyId)
            .ok()
            .and_then(|v| Option::from(v.Anonymous.Anonymous.Anonymous.lVal))
            .unwrap_or(0)
    }
}

fn get_element_name(element: &IUIAutomationElement) -> Option<String> {
    unsafe {
        element
            .GetCurrentPropertyValue(UIA_NamePropertyId)
            .ok()
            .and_then(|v| {
                let bstr_ref = &v.Anonymous.Anonymous.Anonymous.bstrVal;
                let s = bstr_ref.to_string();
                if s.is_empty() {
                    None
                } else {
                    Some(s)
                }
            })
    }
}

fn get_element_value(element: &IUIAutomationElement) -> Option<String> {
    unsafe {
        let pattern = element.GetCurrentPattern(UIA_ValuePatternId).ok()?;
        if pattern.as_raw().is_null() {
            return None;
        }
        let value_pattern: IUIAutomationValuePattern = pattern.cast().ok()?;
        let value: BSTR = value_pattern.CurrentValue().ok()?;
        let s = value.to_string();
        if s.is_empty() {
            None
        } else {
            Some(s)
        }
    }
}

fn get_element_help_text(element: &IUIAutomationElement) -> Option<String> {
    unsafe {
        element
            .GetCurrentPropertyValue(UIA_HelpTextPropertyId)
            .ok()
            .and_then(|v| {
                let bstr_ref = &v.Anonymous.Anonymous.Anonymous.bstrVal;
                let s = bstr_ref.to_string();
                if s.is_empty() {
                    None
                } else {
                    Some(s)
                }
            })
    }
}

fn should_skip_control_type(control_type: i32) -> bool {
    let skip_types = [
        0, // Unknown
        UIA_ThumbControlTypeId.0,
        UIA_TitleBarControlTypeId.0,
        UIA_ImageControlTypeId.0,
    ];
    skip_types.contains(&control_type)
}

fn is_container_control_type(control_type: i32) -> bool {
    let container_types = [
        UIA_TabControlTypeId.0,
        UIA_MenuControlTypeId.0,
        UIA_MenuBarControlTypeId.0,
        UIA_ToolBarControlTypeId.0,
        UIA_StatusBarControlTypeId.0,
        UIA_HeaderControlTypeId.0,
        UIA_PaneControlTypeId.0,
        UIA_GroupControlTypeId.0,
        UIA_DocumentControlTypeId.0,
        UIA_ListControlTypeId.0,
        UIA_TableControlTypeId.0,
        UIA_TreeControlTypeId.0,
        UIA_DataGridControlTypeId.0,
        UIA_CustomControlTypeId.0,
        UIA_CalendarControlTypeId.0,
        UIA_SemanticZoomControlTypeId.0,
        UIA_AppBarControlTypeId.0,
    ];
    container_types.contains(&control_type)
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
