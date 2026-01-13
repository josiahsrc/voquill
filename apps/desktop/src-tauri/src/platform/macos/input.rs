use core_foundation::base::{CFGetTypeID, CFTypeRef, TCFType};
use core_foundation::boolean::CFBoolean;
use core_foundation::string::{CFString, CFStringGetTypeID, CFStringRef};
use std::ptr;

type AXUIElementRef = CFTypeRef;
type AXError = i32;

const AX_ERROR_SUCCESS: AXError = 0;
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
    fn AXValueCreate(value_type: i32, value: *const CFRange) -> CFTypeRef;
}

#[link(name = "AppKit", kind = "framework")]
extern "C" {
    fn NSAccessibilityPostNotification(element: CFTypeRef, notification: CFStringRef);
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFRelease(cf: CFTypeRef);
}

unsafe fn get_string_attribute(element: CFTypeRef, attribute: CFStringRef) -> Option<String> {
    let mut value: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, attribute, &mut value);

    if result != AX_ERROR_SUCCESS || value.is_null() {
        return None;
    }

    let value_type_id = CFGetTypeID(value);
    let string_type_id = CFStringGetTypeID();

    if value_type_id != string_type_id {
        CFRelease(value);
        return None;
    }

    let cf_string = CFString::wrap_under_get_rule(value as _);
    let string = cf_string.to_string();
    CFRelease(value);

    Some(string)
}

unsafe fn get_selection_range(element: CFTypeRef, attribute: CFStringRef) -> Option<(usize, usize)> {
    let mut value: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, attribute, &mut value);

    if result != AX_ERROR_SUCCESS || value.is_null() {
        return None;
    }

    let mut range = CFRange {
        location: 0,
        length: 0,
    };

    if AXValueGetValue(value, AX_VALUE_TYPE_CF_RANGE, &mut range) {
        CFRelease(value);
        if range.location >= 0 {
            Some((range.location as usize, range.length.max(0) as usize))
        } else {
            None
        }
    } else {
        CFRelease(value);
        None
    }
}

pub(crate) fn paste_text_into_focused_field(text: &str, _keybind: Option<&str>) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    unsafe {
        let system_wide = AXUIElementCreateSystemWide();
        if system_wide.is_null() {
            return Err("failed to create system-wide accessibility element".to_string());
        }

        let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
        let mut focused_element: CFTypeRef = ptr::null();
        let result = AXUIElementCopyAttributeValue(
            system_wide,
            ax_focused_ui_element.as_concrete_TypeRef(),
            &mut focused_element,
        );

        CFRelease(system_wide);

        if result != AX_ERROR_SUCCESS || focused_element.is_null() {
            return Err("failed to get focused element".to_string());
        }

        let ax_value = CFString::new("AXValue");
        let ax_selected_text_range = CFString::new("AXSelectedTextRange");
        let ax_focused = CFString::new("AXFocused");

        let _ = AXUIElementSetAttributeValue(
            focused_element,
            ax_focused.as_concrete_TypeRef(),
            CFBoolean::true_value().as_CFTypeRef(),
        );

        let current_text = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef())
            .unwrap_or_default();

        let (cursor_pos, selection_len) = get_selection_range(
            focused_element,
            ax_selected_text_range.as_concrete_TypeRef(),
        )
        .unwrap_or((current_text.len(), 0));

        let char_indices: Vec<usize> = current_text.char_indices().map(|(i, _)| i).collect();
        let text_len = char_indices.len();

        let byte_start = if cursor_pos < text_len {
            char_indices[cursor_pos]
        } else {
            current_text.len()
        };

        let byte_end = if cursor_pos + selection_len <= text_len {
            if cursor_pos + selection_len < text_len {
                char_indices[cursor_pos + selection_len]
            } else {
                current_text.len()
            }
        } else {
            current_text.len()
        };

        let new_text = format!(
            "{}{}{}",
            &current_text[..byte_start],
            text,
            &current_text[byte_end..]
        );

        let new_text_cf = CFString::new(&new_text);
        let set_result = AXUIElementSetAttributeValue(
            focused_element,
            ax_value.as_concrete_TypeRef(),
            new_text_cf.as_CFTypeRef(),
        );

        if set_result != AX_ERROR_SUCCESS {
            CFRelease(focused_element);
            return Err(format!(
                "failed to set AXValue via accessibility API (error: {})",
                set_result
            ));
        }

        let ax_value_changed = CFString::new("AXValueChanged");
        NSAccessibilityPostNotification(
            focused_element,
            ax_value_changed.as_concrete_TypeRef(),
        );

        let new_cursor_pos = cursor_pos + text.chars().count();
        let new_range = CFRange {
            location: new_cursor_pos as isize,
            length: 0,
        };
        let range_value = AXValueCreate(AX_VALUE_TYPE_CF_RANGE, &new_range);
        if !range_value.is_null() {
            AXUIElementSetAttributeValue(
                focused_element,
                ax_selected_text_range.as_concrete_TypeRef(),
                range_value,
            );
            CFRelease(range_value);
        }

        CFRelease(focused_element);

        Ok(())
    }
}
