#![allow(clippy::missing_safety_doc)]

use crate::commands::AccessibilityInfo;
use core_foundation::base::{CFRelease, CFTypeRef, TCFType};
use core_foundation::string::{CFString, CFStringRef};
use std::ptr;

// AXUIElement types and functions from ApplicationServices framework
type AXUIElementRef = CFTypeRef;
type AXError = i32;

const AX_ERROR_SUCCESS: AXError = 0;

// AXValue type constants
const AX_VALUE_TYPE_CF_RANGE: i32 = 4;

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct CFRange {
    location: isize,
    length: isize,
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: *mut CFTypeRef,
    ) -> AXError;
    fn AXUIElementSetAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: CFTypeRef,
    ) -> AXError;
    fn AXValueGetValue(value: CFTypeRef, value_type: i32, out: *mut CFRange) -> bool;
}

/// Get accessibility information about the currently focused text field.
/// Uses macOS AXUIElement APIs to retrieve cursor position, selection length, and text content.
pub fn get_accessibility_info() -> AccessibilityInfo {
    unsafe { get_accessibility_info_impl() }
}

unsafe fn get_accessibility_info_impl() -> AccessibilityInfo {
    // Create the attribute name strings
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_value = CFString::new("AXValue");
    let ax_selected_text_range = CFString::new("AXSelectedTextRange");

    // Create system-wide accessibility element
    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        eprintln!("[macos::accessibility] Failed to create system-wide AXUIElement");
        return empty_info();
    }

    // Get the currently focused UI element
    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        eprintln!(
            "[macos::accessibility] Failed to get focused element, error: {}",
            result
        );
        return empty_info();
    }

    // Get text content (AXValue)
    let text_content = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef());

    // Get selected text range (AXSelectedTextRange)
    let (cursor_position, selection_length) =
        get_range_attribute(focused_element, ax_selected_text_range.as_concrete_TypeRef());

    CFRelease(focused_element);

    eprintln!(
        "[macos::accessibility] Retrieved: cursor={:?}, selection_len={:?}, text_len={:?}",
        cursor_position,
        selection_length,
        text_content.as_ref().map(|s| s.len())
    );

    AccessibilityInfo {
        cursor_position,
        selection_length,
        text_content,
    }
}

unsafe fn get_string_attribute(element: CFTypeRef, attribute: CFStringRef) -> Option<String> {
    let mut value: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, attribute, &mut value);

    if result != AX_ERROR_SUCCESS || value.is_null() {
        return None;
    }

    // The value should be a CFString - try to convert it
    let cf_string = CFString::wrap_under_get_rule(value as _);
    let string = cf_string.to_string();

    // Release the value we got from Copy
    CFRelease(value);

    Some(string)
}

unsafe fn get_range_attribute(
    element: CFTypeRef,
    attribute: CFStringRef,
) -> (Option<usize>, Option<usize>) {
    let mut value: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, attribute, &mut value);

    if result != AX_ERROR_SUCCESS || value.is_null() {
        return (None, None);
    }

    // The value is an AXValue containing a CFRange
    let mut range = CFRange {
        location: 0,
        length: 0,
    };

    if AXValueGetValue(value, AX_VALUE_TYPE_CF_RANGE, &mut range) {
        CFRelease(value);

        let cursor = if range.location >= 0 {
            Some(range.location as usize)
        } else {
            None
        };
        let length = if range.length >= 0 {
            Some(range.length as usize)
        } else {
            None
        };

        (cursor, length)
    } else {
        CFRelease(value);
        (None, None)
    }
}

fn empty_info() -> AccessibilityInfo {
    AccessibilityInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}

pub fn set_text_field_value(value: &str) -> Result<(), String> {
    unsafe { set_text_field_value_impl(value) }
}

unsafe fn set_text_field_value_impl(value: &str) -> Result<(), String> {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_value = CFString::new("AXValue");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return Err("Failed to create system-wide AXUIElement".to_string());
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return Err(format!(
            "Failed to get focused element, error code: {}",
            result
        ));
    }

    let value_cfstring = CFString::new(value);
    let set_result = AXUIElementSetAttributeValue(
        focused_element,
        ax_value.as_concrete_TypeRef(),
        value_cfstring.as_CFTypeRef(),
    );

    CFRelease(focused_element);

    if set_result != AX_ERROR_SUCCESS {
        return Err(format!(
            "Failed to set text field value, error code: {}",
            set_result
        ));
    }

    Ok(())
}
