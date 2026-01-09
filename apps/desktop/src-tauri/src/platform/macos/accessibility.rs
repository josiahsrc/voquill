#![allow(clippy::missing_safety_doc)]

use crate::commands::{ScreenContextInfo, TextFieldInfo};
use core_foundation::array::{CFArrayGetCount, CFArrayGetValueAtIndex};
use core_foundation::base::{CFGetTypeID, CFRelease, CFTypeRef, TCFType};
use core_foundation::string::{CFString, CFStringGetTypeID, CFStringRef};
use std::panic::{catch_unwind, AssertUnwindSafe};
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
    fn AXValueCreate(value_type: i32, value: *const CFRange) -> CFTypeRef;
}

/// Get text field information (cursor position, selection length, text content) without screen context.
pub fn get_text_field_info() -> TextFieldInfo {
    catch_unwind(AssertUnwindSafe(|| unsafe { get_text_field_info_impl() }))
        .unwrap_or_else(|_| {
            eprintln!("[macos::accessibility] get_text_field_info panicked, returning empty");
            empty_text_field_info()
        })
}

/// Get screen context information gathered from the screen around the focused element.
pub fn get_screen_context() -> ScreenContextInfo {
    catch_unwind(AssertUnwindSafe(|| unsafe { get_screen_context_impl() }))
        .unwrap_or_else(|_| {
            eprintln!("[macos::accessibility] get_screen_context panicked, returning empty");
            ScreenContextInfo { screen_context: None }
        })
}

unsafe fn get_text_field_info_impl() -> TextFieldInfo {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_value = CFString::new("AXValue");
    let ax_selected_text_range = CFString::new("AXSelectedTextRange");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return empty_text_field_info();
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return empty_text_field_info();
    }

    let text_content = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef());

    let (cursor_position, selection_length) =
        get_range_attribute(focused_element, ax_selected_text_range.as_concrete_TypeRef());

    CFRelease(focused_element);

    TextFieldInfo {
        cursor_position,
        selection_length,
        text_content,
    }
}

unsafe fn get_screen_context_impl() -> ScreenContextInfo {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return ScreenContextInfo { screen_context: None };
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return ScreenContextInfo { screen_context: None };
    }

    let context = gather_context_outward(focused_element);
    let screen_context = if context.is_empty() { None } else { Some(context) };

    CFRelease(focused_element);

    ScreenContextInfo { screen_context }
}

fn empty_text_field_info() -> TextFieldInfo {
    TextFieldInfo {
        cursor_position: None,
        selection_length: None,
        text_content: None,
    }
}

unsafe fn get_string_attribute(element: CFTypeRef, attribute: CFStringRef) -> Option<String> {
    let mut value: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, attribute, &mut value);

    if result != AX_ERROR_SUCCESS || value.is_null() {
        return None;
    }

    // Verify the value is actually a CFString before converting
    let value_type_id = CFGetTypeID(value);
    let string_type_id = CFStringGetTypeID();

    if value_type_id != string_type_id {
        CFRelease(value);
        return None;
    }

    // The value is a CFString - convert it
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

const MAX_CONTEXT_LENGTH: usize = 12000;
const MAX_LEVELS_UP: usize = 20;
const MAX_SIBLINGS: isize = 60;

unsafe fn extract_text_from_element(
    element: CFTypeRef,
    role: &str,
    ax_title: CFStringRef,
    ax_value: CFStringRef,
    ax_description: CFStringRef,
    ax_placeholder: CFStringRef,
) -> Vec<String> {
    let mut texts = Vec::new();

    // Get title (safe for all elements)
    if let Some(title) = get_string_attribute(element, ax_title) {
        let t = title.trim();
        if !t.is_empty() && t.len() < 500 {
            texts.push(t.to_string());
        }
    }

    // Get value for elements that safely support it
    let value_safe_roles = [
        "AXStaticText", "AXLink", "AXCell", "AXMenuItem",
    ];
    if value_safe_roles.iter().any(|&r| role == r) {
        if let Some(value) = get_string_attribute(element, ax_value) {
            let t = value.trim();
            if !t.is_empty() && t.len() < 500 {
                texts.push(t.to_string());
            }
        }
    }

    // Get description (safe for all elements)
    if let Some(desc) = get_string_attribute(element, ax_description) {
        let t = desc.trim();
        if !t.is_empty() && t.len() < 500 {
            texts.push(t.to_string());
        }
    }

    // Get placeholder for text fields
    if role == "AXTextField" || role == "AXTextArea" || role == "AXComboBox" {
        if let Some(ph) = get_string_attribute(element, ax_placeholder) {
            let t = ph.trim();
            if !t.is_empty() {
                texts.push(format!("[placeholder: {}]", t));
            }
        }
    }

    texts
}

unsafe fn extract_text_from_web_area(
    element: CFTypeRef,
    ax_role: CFStringRef,
    ax_value: CFStringRef,
    ax_children: CFStringRef,
    depth: usize,
    max_depth: usize,
    collected_len: &mut usize,
    max_len: usize,
) -> Vec<String> {
    if element.is_null() || depth > max_depth || *collected_len > max_len {
        return Vec::new();
    }

    let mut texts = Vec::new();

    let role = get_string_attribute(element, ax_role).unwrap_or_default();

    let text_roles = [
        "AXStaticText",
        "AXLink",
        "AXHeading",
        "AXParagraph",
        "AXTextArea",
    ];
    if text_roles.iter().any(|&r| role == r) {
        if let Some(value) = get_string_attribute(element, ax_value) {
            let t = value.trim();
            if !t.is_empty() && t.len() < 1000 {
                *collected_len += t.len();
                texts.push(t.to_string());
            }
        }
    }

    if *collected_len > max_len {
        return texts;
    }

    let mut children_ref: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(element, ax_children, &mut children_ref);
    if result == AX_ERROR_SUCCESS && !children_ref.is_null() {
        let arr = children_ref as core_foundation::array::CFArrayRef;
        let count = CFArrayGetCount(arr).min(100);
        for i in 0..count {
            if *collected_len > max_len {
                break;
            }
            let child = CFArrayGetValueAtIndex(arr, i);
            if !child.is_null() {
                let child_texts = extract_text_from_web_area(
                    child,
                    ax_role,
                    ax_value,
                    ax_children,
                    depth + 1,
                    max_depth,
                    collected_len,
                    max_len,
                );
                texts.extend(child_texts);
            }
        }
        CFRelease(children_ref);
    }

    texts
}

unsafe fn extract_text_recursive(
    element: CFTypeRef,
    ax_role: CFStringRef,
    ax_title: CFStringRef,
    ax_value: CFStringRef,
    ax_description: CFStringRef,
    ax_placeholder: CFStringRef,
    ax_children: CFStringRef,
    depth: usize,
    max_depth: usize,
) -> Vec<String> {
    if element.is_null() || depth > max_depth {
        return Vec::new();
    }

    let mut texts = Vec::new();

    let role = match get_string_attribute(element, ax_role) {
        Some(r) => r,
        None => return texts,
    };

    // Handle web areas specially (email content, browser content)
    if role == "AXWebArea" {
        let mut collected_len = 0;
        let web_texts = extract_text_from_web_area(
            element,
            ax_role,
            ax_value,
            ax_children,
            0,
            15,
            &mut collected_len,
            8000,
        );
        texts.extend(web_texts);
        return texts;
    }

    // Skip other problematic containers
    if role == "AXScrollArea" || role == "AXUnknown" {
        return texts;
    }

    // Extract text from this element
    let element_texts = extract_text_from_element(
        element,
        &role,
        ax_title,
        ax_value,
        ax_description,
        ax_placeholder,
    );
    texts.extend(element_texts);

    // Recurse into children for container types
    let container_roles = [
        "AXGroup", "AXCell", "AXRow", "AXList", "AXTable",
        "AXOutline", "AXSection", "AXForm", "AXArticle",
        "AXLandmarkMain", "AXLandmarkNavigation", "AXLandmarkSearch",
    ];
    if container_roles.iter().any(|&c| role == c) {
        let mut children_ref: CFTypeRef = ptr::null();
        let result = AXUIElementCopyAttributeValue(element, ax_children, &mut children_ref);
        if result == AX_ERROR_SUCCESS && !children_ref.is_null() {
            let arr = children_ref as core_foundation::array::CFArrayRef;
            let count = CFArrayGetCount(arr).min(30);
            for i in 0..count {
                let child = CFArrayGetValueAtIndex(arr, i);
                if !child.is_null() {
                    let child_texts = extract_text_recursive(
                        child,
                        ax_role,
                        ax_title,
                        ax_value,
                        ax_description,
                        ax_placeholder,
                        ax_children,
                        depth + 1,
                        max_depth,
                    );
                    texts.extend(child_texts);
                }
            }
            CFRelease(children_ref);
        }
    }

    texts
}

unsafe fn gather_context_outward(focused_element: CFTypeRef) -> String {
    if focused_element.is_null() {
        return String::new();
    }

    let mut texts: Vec<String> = Vec::new();

    let ax_parent = CFString::new("AXParent");
    let ax_children = CFString::new("AXChildren");
    let ax_role = CFString::new("AXRole");
    let ax_title = CFString::new("AXTitle");
    let ax_value = CFString::new("AXValue");
    let ax_description = CFString::new("AXDescription");
    let ax_placeholder = CFString::new("AXPlaceholderValue");

    // STEP 1: Get info from the focused element itself
    if let Some(role) = get_string_attribute(focused_element, ax_role.as_concrete_TypeRef()) {
        let focused_texts = extract_text_from_element(
            focused_element,
            &role,
            ax_title.as_concrete_TypeRef(),
            ax_value.as_concrete_TypeRef(),
            ax_description.as_concrete_TypeRef(),
            ax_placeholder.as_concrete_TypeRef(),
        );
        texts.extend(focused_texts);
    }

    // STEP 2: Walk up the hierarchy, collecting text from siblings at each level
    let mut current_element = focused_element;
    let mut levels_up = 0;

    while levels_up < MAX_LEVELS_UP {
        let mut parent: CFTypeRef = ptr::null();
        let parent_result = AXUIElementCopyAttributeValue(
            current_element,
            ax_parent.as_concrete_TypeRef(),
            &mut parent,
        );

        if parent_result != AX_ERROR_SUCCESS || parent.is_null() {
            break;
        }

        let parent_role = get_string_attribute(parent, ax_role.as_concrete_TypeRef());

        // If window/app, get title and stop
        if let Some(ref role) = parent_role {
            if role == "AXWindow" || role == "AXApplication" {
                if let Some(title) = get_string_attribute(parent, ax_title.as_concrete_TypeRef()) {
                    let t = title.trim();
                    if !t.is_empty() {
                        texts.push(format!("[Window: {}]", t));
                    }
                }
                CFRelease(parent);
                break;
            }
        }

        // Get parent's title
        if let Some(title) = get_string_attribute(parent, ax_title.as_concrete_TypeRef()) {
            let t = title.trim();
            if !t.is_empty() && t.len() > 1 {
                texts.push(t.to_string());
            }
        }

        // Get siblings (children of parent)
        let mut children_ref: CFTypeRef = ptr::null();
        let children_result = AXUIElementCopyAttributeValue(
            parent,
            ax_children.as_concrete_TypeRef(),
            &mut children_ref,
        );

        if children_result == AX_ERROR_SUCCESS && !children_ref.is_null() {
            let arr = children_ref as core_foundation::array::CFArrayRef;
            let count = CFArrayGetCount(arr).min(MAX_SIBLINGS);

            for i in 0..count {
                let sibling = CFArrayGetValueAtIndex(arr, i);
                if sibling.is_null() {
                    continue;
                }

                // Extract text recursively (up to 5 levels deep into containers)
                let sibling_texts = extract_text_recursive(
                    sibling,
                    ax_role.as_concrete_TypeRef(),
                    ax_title.as_concrete_TypeRef(),
                    ax_value.as_concrete_TypeRef(),
                    ax_description.as_concrete_TypeRef(),
                    ax_placeholder.as_concrete_TypeRef(),
                    ax_children.as_concrete_TypeRef(),
                    0,
                    5, // max 5 levels deep into each sibling
                );
                texts.extend(sibling_texts);

                // Check length limit
                let current_len: usize = texts.iter().map(|s| s.len()).sum();
                if current_len > MAX_CONTEXT_LENGTH {
                    break;
                }
            }
            CFRelease(children_ref);
        }

        // Check length limit
        let current_len: usize = texts.iter().map(|s| s.len()).sum();
        if current_len > MAX_CONTEXT_LENGTH {
            CFRelease(parent);
            break;
        }

        // Move up
        if levels_up > 0 && current_element != focused_element {
            CFRelease(current_element);
        }
        current_element = parent;
        levels_up += 1;
    }

    // Cleanup
    if levels_up > 0 && current_element != focused_element {
        CFRelease(current_element);
    }

    // Deduplicate while preserving order
    let mut seen = std::collections::HashSet::new();
    let unique_texts: Vec<String> = texts
        .into_iter()
        .filter(|s| seen.insert(s.clone()))
        .collect();

    unique_texts.join("\n")
}

// Legacy function - kept for reference
#[allow(dead_code)]
const MAX_CONTEXT_DEPTH: usize = 10;
#[allow(dead_code)]
const MAX_CHILDREN_TO_TRAVERSE: isize = 100;

#[allow(dead_code)]
unsafe fn gather_screen_context(element: CFTypeRef, depth: usize) -> String {
    // Conservative limits to avoid crashes with problematic elements
    const SAFE_MAX_DEPTH: usize = 3;
    const SAFE_MAX_CHILDREN: isize = 30;
    const SAFE_MAX_TEXTS: usize = 100;

    if element.is_null() || depth > SAFE_MAX_DEPTH {
        return String::new();
    }

    let mut texts: Vec<String> = Vec::new();

    let ax_role = CFString::new("AXRole");
    let ax_title = CFString::new("AXTitle");
    let ax_value = CFString::new("AXValue");
    let ax_children = CFString::new("AXChildren");

    // First check if we can access this element's role - if not, skip entirely
    let mut role_ref: CFTypeRef = ptr::null();
    let role_result =
        AXUIElementCopyAttributeValue(element, ax_role.as_concrete_TypeRef(), &mut role_ref);

    // If we can't get the role, this element doesn't support accessibility properly
    if role_result != AX_ERROR_SUCCESS {
        return String::new();
    }

    let role = if !role_ref.is_null() {
        let cf_string = CFString::wrap_under_get_rule(role_ref as _);
        let s = cf_string.to_string();
        CFRelease(role_ref);
        Some(s)
    } else {
        None
    };

    // Skip certain roles that are known to be problematic or not useful
    if let Some(ref r) = role {
        let skip_roles = [
            "AXWebArea",      // Web content can be huge and problematic
            "AXScrollArea",   // Just a container
            "AXSplitGroup",   // Just a container
            "AXLayoutArea",   // Just a container
            "AXUnknown",      // Unknown elements
        ];
        if skip_roles.iter().any(|&sr| r == sr) {
            return String::new();
        }
    }

    // Extract text from text-bearing elements
    if let Some(ref r) = role {
        let text_roles = [
            "AXStaticText",
            "AXTextField",
            "AXTextArea",
            "AXButton",
            "AXLink",
            "AXHeading",
            "AXCell",
            "AXMenuItem",
            "AXMenuButton",
            "AXPopUpButton",
            "AXComboBox",
            "AXGroup",  // Groups often have titles
            "AXWindow", // Window title
        ];

        if text_roles.iter().any(|&tr| r == tr) {
            // Get title
            if let Some(title) = get_string_attribute(element, ax_title.as_concrete_TypeRef()) {
                let trimmed = title.trim();
                if !trimmed.is_empty() && trimmed.len() > 1 {
                    texts.push(trimmed.to_string());
                }
            }

            // Get value (for text fields, but skip if it's too long - probably the focused field)
            if let Some(value) = get_string_attribute(element, ax_value.as_concrete_TypeRef()) {
                let trimmed = value.trim();
                if !trimmed.is_empty() && trimmed.len() > 1 && trimmed.len() < 500 {
                    texts.push(trimmed.to_string());
                }
            }
        }
    }

    // Get children and recurse (only if we haven't gathered too much yet)
    if texts.len() < SAFE_MAX_TEXTS {
        let mut children_ref: CFTypeRef = ptr::null();
        let children_result = AXUIElementCopyAttributeValue(
            element,
            ax_children.as_concrete_TypeRef(),
            &mut children_ref,
        );

        if children_result == AX_ERROR_SUCCESS && !children_ref.is_null() {
            let children_array = children_ref as core_foundation::array::CFArrayRef;
            let count = CFArrayGetCount(children_array).min(SAFE_MAX_CHILDREN);

            for i in 0..count {
                let child = CFArrayGetValueAtIndex(children_array, i);
                if !child.is_null() {
                    let child_text = gather_screen_context(child, depth + 1);
                    if !child_text.is_empty() {
                        texts.push(child_text);
                    }
                }

                // Stop if we have enough
                let current_len: usize = texts.iter().map(|s| s.len()).sum();
                if current_len > MAX_CONTEXT_LENGTH || texts.len() >= SAFE_MAX_TEXTS {
                    break;
                }
            }
            CFRelease(children_ref);
        }
    }

    texts.join("\n")
}

pub fn get_selected_text() -> Option<String> {
    catch_unwind(AssertUnwindSafe(|| unsafe { get_selected_text_impl() }))
        .unwrap_or_else(|_| {
            eprintln!("[macos::accessibility] get_selected_text panicked, returning None");
            None
        })
}

unsafe fn get_selected_text_impl() -> Option<String> {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_selected_text = CFString::new("AXSelectedText");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return None;
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return None;
    }

    let selected_text = get_string_attribute(focused_element, ax_selected_text.as_concrete_TypeRef());

    CFRelease(focused_element);

    selected_text.filter(|s| !s.is_empty())
}
