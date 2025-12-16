use crate::domain::TextSelection;
use core_foundation::base::{CFRelease, CFTypeRef, TCFType};
use core_foundation::string::CFString;
use core_graphics::event::CGEventTapLocation;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::ffi::c_void;
use std::ptr;

type AXUIElementRef = *mut c_void;
type AXValueRef = *mut c_void;
type AXError = i32;

const AX_ERROR_SUCCESS: AXError = 0;

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct CFRange {
    location: isize,
    length: isize,
}

extern "C" {
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: core_foundation::string::CFStringRef,
        value: *mut CFTypeRef,
    ) -> AXError;
    fn AXValueGetValue(value: AXValueRef, value_type: u32, value_ptr: *mut c_void) -> bool;
}

const AX_VALUE_CF_RANGE_TYPE: u32 = 4;

pub(crate) fn get_text_selection() -> Result<TextSelection, String> {
    unsafe {
        let system_element = AXUIElementCreateSystemWide();
        if system_element.is_null() {
            return Err("Failed to get system-wide accessibility element".to_string());
        }

        let focused_attr = CFString::new("AXFocusedUIElement");
        let mut focused_element: CFTypeRef = ptr::null_mut();
        let result = AXUIElementCopyAttributeValue(
            system_element,
            focused_attr.as_concrete_TypeRef(),
            &mut focused_element,
        );

        CFRelease(system_element as CFTypeRef);

        if result != AX_ERROR_SUCCESS || focused_element.is_null() {
            return Ok(TextSelection::empty());
        }

        let focused_element = focused_element as AXUIElementRef;

        let value_attr = CFString::new("AXValue");
        let mut full_text_value: CFTypeRef = ptr::null_mut();
        let full_text_result = AXUIElementCopyAttributeValue(
            focused_element,
            value_attr.as_concrete_TypeRef(),
            &mut full_text_value,
        );

        let full_text = if full_text_result == AX_ERROR_SUCCESS && !full_text_value.is_null() {
            let cf_string = core_foundation::string::CFString::wrap_under_create_rule(
                full_text_value as core_foundation::string::CFStringRef,
            );
            cf_string.to_string()
        } else {
            String::new()
        };

        let selected_text_attr = CFString::new("AXSelectedText");
        let mut selected_text_value: CFTypeRef = ptr::null_mut();
        let text_result = AXUIElementCopyAttributeValue(
            focused_element,
            selected_text_attr.as_concrete_TypeRef(),
            &mut selected_text_value,
        );

        let selected_text = if text_result == AX_ERROR_SUCCESS && !selected_text_value.is_null() {
            let cf_string = core_foundation::string::CFString::wrap_under_create_rule(
                selected_text_value as core_foundation::string::CFStringRef,
            );
            cf_string.to_string()
        } else {
            String::new()
        };

        let selected_range_attr = CFString::new("AXSelectedTextRange");
        let mut selected_range_value: CFTypeRef = ptr::null_mut();
        let range_result = AXUIElementCopyAttributeValue(
            focused_element,
            selected_range_attr.as_concrete_TypeRef(),
            &mut selected_range_value,
        );

        let (start_index, length) =
            if range_result == AX_ERROR_SUCCESS && !selected_range_value.is_null() {
                let mut range = CFRange {
                    location: 0,
                    length: 0,
                };
                let got_value = AXValueGetValue(
                    selected_range_value as AXValueRef,
                    AX_VALUE_CF_RANGE_TYPE,
                    &mut range as *mut CFRange as *mut c_void,
                );

                CFRelease(selected_range_value);

                if got_value {
                    (
                        range.location.max(0) as usize,
                        range.length.max(0) as usize,
                    )
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            };

        CFRelease(focused_element as CFTypeRef);

        Ok(TextSelection::new(full_text, selected_text, start_index, length))
    }
}

pub(crate) fn paste_text_into_focused_field(text: &str) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source".to_string())?;

    let key_down = core_graphics::event::CGEvent::new_keyboard_event(source.clone(), 0, true)
        .map_err(|_| "failed to create key-down event".to_string())?;
    key_down.set_string(text);
    key_down.post(CGEventTapLocation::HID);

    let key_up = core_graphics::event::CGEvent::new_keyboard_event(source, 0, false)
        .map_err(|_| "failed to create key-up event".to_string())?;
    key_up.set_string("");
    key_up.post(CGEventTapLocation::HID);

    Ok(())
}
