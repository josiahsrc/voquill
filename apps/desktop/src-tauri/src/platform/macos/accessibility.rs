#![allow(clippy::missing_safety_doc)]

use crate::commands::{ScreenContextInfo, TextFieldInfo};
use core_foundation::array::{CFArrayGetCount, CFArrayGetValueAtIndex};
use core_foundation::base::{CFGetTypeID, CFRelease, CFTypeRef, TCFType};
use core_foundation::string::{CFString, CFStringGetTypeID, CFStringRef};
use std::ffi::c_void;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::ptr;

extern "C" {
    fn dispatch_sync_f(queue: *mut c_void, context: *mut c_void, work: extern "C" fn(*mut c_void));
    static _dispatch_main_q: u8;
}

fn run_on_main_thread<F, R>(f: F) -> R
where
    F: FnOnce() -> R + Send,
    R: Send,
{
    struct Context<F, R> {
        f: Option<F>,
        result: Option<R>,
    }

    extern "C" fn trampoline<F, R>(ctx: *mut c_void)
    where
        F: FnOnce() -> R,
    {
        unsafe {
            let ctx = &mut *(ctx as *mut Context<F, R>);
            let f = ctx.f.take().unwrap();
            ctx.result = Some(f());
        }
    }

    let mut ctx = Context {
        f: Some(f),
        result: None,
    };

    unsafe {
        let main_q = &_dispatch_main_q as *const u8 as *mut c_void;
        dispatch_sync_f(
            main_q,
            &mut ctx as *mut Context<F, R> as *mut c_void,
            trampoline::<F, R>,
        );
    }

    ctx.result.unwrap()
}

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
#[allow(dead_code)]
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
    fn AXUIElementIsAttributeSettable(
        element: AXUIElementRef,
        attribute: CFStringRef,
        settable: *mut bool,
    ) -> AXError;
    fn AXValueGetValue(value: CFTypeRef, value_type: i32, out: *mut CFRange) -> bool;
    fn AXValueCreate(value_type: i32, value: *const CFRange) -> CFTypeRef;
    fn AXUIElementGetPid(element: AXUIElementRef, pid: *mut i32) -> AXError;
    fn AXUIElementCreateApplication(pid: i32) -> AXUIElementRef;
}

/// Get text field information (cursor position, selection length, text content) without screen context.
pub fn get_text_field_info() -> TextFieldInfo {
    catch_unwind(AssertUnwindSafe(|| unsafe { get_text_field_info_impl() })).unwrap_or_else(|_| {
        log::error!("get_text_field_info panicked, returning empty");
        empty_text_field_info()
    })
}

/// Get screen context information gathered from the screen around the focused element.
pub fn get_screen_context() -> ScreenContextInfo {
    catch_unwind(AssertUnwindSafe(|| unsafe { get_screen_context_impl() })).unwrap_or_else(|_| {
        log::error!("get_screen_context panicked, returning empty");
        ScreenContextInfo {
            screen_context: None,
        }
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

    let (cursor_position, selection_length) = get_range_attribute(
        focused_element,
        ax_selected_text_range.as_concrete_TypeRef(),
    );

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
        return ScreenContextInfo {
            screen_context: None,
        };
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return ScreenContextInfo {
            screen_context: None,
        };
    }

    let context = gather_context_outward(focused_element);
    let screen_context = if context.is_empty() {
        None
    } else {
        Some(context)
    };

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

unsafe fn is_element_inside_web_area(focused_element: CFTypeRef) -> bool {
    if focused_element.is_null() {
        return false;
    }

    let ax_parent = CFString::new("AXParent");
    let ax_role = CFString::new("AXRole");
    let mut current_element = focused_element;
    let mut levels_up = 0;

    while levels_up < MAX_LEVELS_UP {
        if let Some(role) = get_string_attribute(current_element, ax_role.as_concrete_TypeRef()) {
            if role == "AXWebArea" {
                if current_element != focused_element {
                    CFRelease(current_element);
                }
                return true;
            }

            if role == "AXWindow" || role == "AXApplication" {
                break;
            }
        }

        let mut parent: CFTypeRef = ptr::null();
        let parent_result = AXUIElementCopyAttributeValue(
            current_element,
            ax_parent.as_concrete_TypeRef(),
            &mut parent,
        );

        if parent_result != AX_ERROR_SUCCESS || parent.is_null() {
            break;
        }

        if current_element != focused_element {
            CFRelease(current_element);
        }

        current_element = parent;
        levels_up += 1;
    }

    if current_element != focused_element {
        CFRelease(current_element);
    }

    false
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
    let value_safe_roles = ["AXStaticText", "AXLink", "AXCell", "AXMenuItem"];
    if value_safe_roles.contains(&role) {
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

#[allow(clippy::too_many_arguments)]
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

#[allow(clippy::too_many_arguments)]
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
        "AXGroup",
        "AXCell",
        "AXRow",
        "AXList",
        "AXTable",
        "AXOutline",
        "AXSection",
        "AXForm",
        "AXArticle",
        "AXLandmarkMain",
        "AXLandmarkNavigation",
        "AXLandmarkSearch",
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
            "AXWebArea",    // Web content can be huge and problematic
            "AXScrollArea", // Just a container
            "AXSplitGroup", // Just a container
            "AXLayoutArea", // Just a container
            "AXUnknown",    // Unknown elements
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

pub fn insert_text_at_cursor(text: &str) -> Result<(), String> {
    let text = text.to_string();
    run_on_main_thread(move || {
        catch_unwind(AssertUnwindSafe(move || unsafe {
            insert_text_at_cursor_impl(&text)
        }))
        .unwrap_or_else(|_| Err("accessibility insert panicked".to_string()))
    })
}

unsafe fn insert_text_at_cursor_impl(text: &str) -> Result<(), String> {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_selected_text = CFString::new("AXSelectedText");
    let ax_value = CFString::new("AXValue");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return Err("failed to get system-wide AX element".to_string());
    }

    let mut focused_element: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused_element,
    );

    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS || focused_element.is_null() {
        return Err("no focused element".to_string());
    }

    if is_element_inside_web_area(focused_element) {
        CFRelease(focused_element);
        return Err("focused element is inside AXWebArea".to_string());
    }

    // Check if the focused element actually supports setting AXSelectedText
    let mut settable = false;
    let settable_result = AXUIElementIsAttributeSettable(
        focused_element,
        ax_selected_text.as_concrete_TypeRef(),
        &mut settable,
    );

    if settable_result != AX_ERROR_SUCCESS || !settable {
        CFRelease(focused_element);
        return Err("AXSelectedText is not settable on focused element".to_string());
    }

    // Snapshot the field value before inserting so we can verify
    let value_before = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef());

    let cf_text = CFString::new(text);
    let set_result = AXUIElementSetAttributeValue(
        focused_element,
        ax_selected_text.as_concrete_TypeRef(),
        cf_text.as_CFTypeRef(),
    );

    if set_result != AX_ERROR_SUCCESS {
        CFRelease(focused_element);
        return Err(format!("AXUIElementSetAttributeValue failed: {set_result}"));
    }

    // Verify: if we can read the value and it didn't change, the insert silently failed
    let value_after = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef());
    CFRelease(focused_element);

    if let (Some(before), Some(after)) = (&value_before, &value_after) {
        if before == after {
            return Err("AXSelectedText accepted but field value unchanged".to_string());
        }
    }

    Ok(())
}

pub fn check_focused_paste_target() -> crate::commands::PasteTargetState {
    use crate::commands::PasteTargetState;
    catch_unwind(AssertUnwindSafe(|| unsafe {
        check_focused_paste_target_impl()
    }))
    .unwrap_or(PasteTargetState::Unknown)
}

unsafe fn check_focused_paste_target_impl() -> crate::commands::PasteTargetState {
    use crate::commands::PasteTargetState;

    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_role = CFString::new("AXRole");
    let ax_value = CFString::new("AXValue");
    let ax_selected_text = CFString::new("AXSelectedText");

    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return PasteTargetState::Unknown;
    }

    let mut focused: CFTypeRef = ptr::null();
    let result = AXUIElementCopyAttributeValue(
        system_wide,
        ax_focused_ui_element.as_concrete_TypeRef(),
        &mut focused,
    );
    CFRelease(system_wide);

    if result != AX_ERROR_SUCCESS {
        return PasteTargetState::Unknown;
    }
    if focused.is_null() {
        return PasteTargetState::NotEditable;
    }

    let role = get_string_attribute(focused, ax_role.as_concrete_TypeRef());

    let editable_roles = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField"];
    if let Some(ref r) = role {
        if editable_roles.iter().any(|er| er == r) {
            CFRelease(focused);
            return PasteTargetState::Editable;
        }
    }

    if is_element_inside_web_area(focused) {
        CFRelease(focused);
        return PasteTargetState::Unknown;
    }

    let mut settable = false;
    let settable_result = AXUIElementIsAttributeSettable(
        focused,
        ax_selected_text.as_concrete_TypeRef(),
        &mut settable,
    );
    if settable_result == AX_ERROR_SUCCESS && settable {
        CFRelease(focused);
        return PasteTargetState::Editable;
    }

    settable = false;
    let value_settable_result =
        AXUIElementIsAttributeSettable(focused, ax_value.as_concrete_TypeRef(), &mut settable);
    CFRelease(focused);

    if value_settable_result == AX_ERROR_SUCCESS && settable {
        return PasteTargetState::Editable;
    }

    PasteTargetState::NotEditable
}

pub fn get_selected_text() -> Option<String> {
    use std::{thread, time::Duration};

    // Wait for hotkey modifier keys to physically release before simulating Cmd+C
    thread::sleep(Duration::from_millis(50));

    let mut clipboard = arboard::Clipboard::new().ok()?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard.clear().ok();

    super::input::simulate_cmd_c().ok()?;
    thread::sleep(Duration::from_millis(100));

    let selected = clipboard.get_text().ok();

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(100));
        previous.restore();
    });

    selected.filter(|s| !s.is_empty())
}

pub fn gather_accessibility_dump() -> crate::commands::AccessibilityDumpResult {
    log::warn!("gather_accessibility_dump not yet implemented for macOS (AX API)");
    crate::commands::AccessibilityDumpResult {
        dump: None,
        window_title: None,
        process_name: None,
        element_count: 0,
    }
}

pub fn get_focused_field_info() -> Option<crate::commands::AccessibilityFieldInfo> {
    catch_unwind(AssertUnwindSafe(|| unsafe {
        get_focused_field_info_impl()
    }))
    .unwrap_or_else(|_| {
        log::error!("get_focused_field_info panicked, returning None");
        None
    })
}

unsafe fn get_focused_field_info_impl() -> Option<crate::commands::AccessibilityFieldInfo> {
    let ax_focused_ui_element = CFString::new("AXFocusedUIElement");
    let ax_role = CFString::new("AXRole");
    let ax_title = CFString::new("AXTitle");
    let ax_description = CFString::new("AXDescription");
    let ax_value = CFString::new("AXValue");
    let ax_placeholder = CFString::new("AXPlaceholderValue");
    let ax_parent = CFString::new("AXParent");
    let ax_children = CFString::new("AXChildren");

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

    let role = get_string_attribute(focused_element, ax_role.as_concrete_TypeRef());
    let title = get_string_attribute(focused_element, ax_title.as_concrete_TypeRef());
    let description = get_string_attribute(focused_element, ax_description.as_concrete_TypeRef());
    let value = get_string_attribute(focused_element, ax_value.as_concrete_TypeRef());
    let placeholder = get_string_attribute(focused_element, ax_placeholder.as_concrete_TypeRef());

    let mut is_settable = false;
    AXUIElementIsAttributeSettable(
        focused_element,
        ax_value.as_concrete_TypeRef(),
        &mut is_settable,
    );

    let mut app_pid: Option<i32> = None;
    let mut pid: i32 = 0;
    if AXUIElementGetPid(focused_element as AXUIElementRef, &mut pid) == AX_ERROR_SUCCESS {
        app_pid = Some(pid);
    }

    let mut element_index_path: Vec<usize> = Vec::new();
    let mut fingerprint_chain: Vec<crate::commands::ElementFingerprint> = Vec::new();
    let mut app_name: Option<String> = None;
    let mut window_title: Option<String> = None;

    let mut current = focused_element;
    let mut depth = 0;

    while depth < MAX_LEVELS_UP {
        let mut parent: CFTypeRef = ptr::null();
        let parent_result =
            AXUIElementCopyAttributeValue(current, ax_parent.as_concrete_TypeRef(), &mut parent);

        if parent_result != AX_ERROR_SUCCESS || parent.is_null() {
            break;
        }

        let mut children_ref: CFTypeRef = ptr::null();
        let children_result = AXUIElementCopyAttributeValue(
            parent,
            ax_children.as_concrete_TypeRef(),
            &mut children_ref,
        );
        if children_result == AX_ERROR_SUCCESS && !children_ref.is_null() {
            let arr = children_ref as core_foundation::array::CFArrayRef;
            let count = CFArrayGetCount(arr);
            let mut chosen_index: Option<usize> = None;
            for i in 0..count {
                let child = CFArrayGetValueAtIndex(arr, i);
                let mut child_pid: i32 = 0;
                let child_pid_ok =
                    AXUIElementGetPid(child as AXUIElementRef, &mut child_pid) == AX_ERROR_SUCCESS;
                let mut current_pid: i32 = 0;
                let current_pid_ok = AXUIElementGetPid(current as AXUIElementRef, &mut current_pid)
                    == AX_ERROR_SUCCESS;
                if child_pid_ok
                    && current_pid_ok
                    && child_pid == current_pid
                    && core_foundation::base::CFEqual(child, current) != 0
                {
                    chosen_index = Some(i as usize);
                    break;
                }
            }
            if chosen_index.is_none() {
                for i in 0..count {
                    let child = CFArrayGetValueAtIndex(arr, i);
                    if child == current {
                        chosen_index = Some(i as usize);
                        break;
                    }
                }
            }
            if let Some(idx) = chosen_index {
                element_index_path.push(idx);
                fingerprint_chain.push(capture_macos_fingerprint(current, idx));
            }
            CFRelease(children_ref);
        }

        let parent_role = get_string_attribute(parent, ax_role.as_concrete_TypeRef());
        if let Some(ref r) = parent_role {
            if r == "AXWindow" {
                window_title = get_string_attribute(parent, ax_title.as_concrete_TypeRef());
            }
            if r == "AXApplication" {
                app_name = get_string_attribute(parent, ax_title.as_concrete_TypeRef());
                if current != focused_element {
                    CFRelease(current);
                }
                current = focused_element;
                CFRelease(parent);
                break;
            }
        }

        if current != focused_element {
            CFRelease(current);
        }
        current = parent;
        depth += 1;
    }

    if current != focused_element {
        CFRelease(current);
    }

    element_index_path.reverse();
    fingerprint_chain.reverse();

    CFRelease(focused_element);

    let app_identity = app_pid.and_then(capture_app_identity);

    Some(crate::commands::AccessibilityFieldInfo {
        role,
        title,
        description,
        value,
        placeholder,
        app_pid,
        app_name,
        window_title,
        is_settable,
        element_index_path,
        fingerprint_chain,
        can_paste: false,
        backend: None,
        jab_string_path: vec![],
        app_identity,
        details: None,
    })
}

/// Snapshot the identifying attributes of a macOS AX element. Captured at
/// bind time and used at sync time to verify we land on the same element
/// even when the AX tree shifts (Java Swing in particular reorders/inserts
/// helper nodes between bind and sync).
unsafe fn capture_macos_fingerprint(
    element: CFTypeRef,
    child_index: usize,
) -> crate::commands::ElementFingerprint {
    let role = get_string_attribute(element, CFString::new("AXRole").as_concrete_TypeRef());
    let subrole = get_string_attribute(element, CFString::new("AXSubrole").as_concrete_TypeRef());
    let title = get_string_attribute(element, CFString::new("AXTitle").as_concrete_TypeRef());
    let description =
        get_string_attribute(element, CFString::new("AXDescription").as_concrete_TypeRef());
    let identifier =
        get_string_attribute(element, CFString::new("AXIdentifier").as_concrete_TypeRef());

    crate::commands::ElementFingerprint {
        automation_id: None,
        class_name: None,
        control_type: 0,
        name: None,
        framework_id: None,
        child_index,
        ax_role: role,
        ax_subrole: subrole,
        ax_title: title,
        ax_description: description,
        ax_identifier: identifier,
        details: None,
    }
}

/// Score how well `element` matches `fp`. Returns 0 when the element is
/// definitely the wrong one (mismatched role or identifier); otherwise
/// returns a positive score weighted by how many attributes agree.
unsafe fn fingerprint_score(
    element: CFTypeRef,
    fp: &crate::commands::ElementFingerprint,
    actual_index: usize,
) -> u32 {
    let mut score: u32 = 0;

    if let Some(ref expected) = fp.ax_identifier {
        match get_string_attribute(element, CFString::new("AXIdentifier").as_concrete_TypeRef()) {
            Some(a) if &a == expected => score += 200,
            Some(_) => return 0,
            None => {}
        }
    }

    if let Some(ref expected) = fp.ax_role {
        match get_string_attribute(element, CFString::new("AXRole").as_concrete_TypeRef()) {
            Some(a) if &a == expected => score += 50,
            _ => return 0,
        }
    }

    if let Some(ref expected) = fp.ax_subrole {
        if let Some(a) = get_string_attribute(element, CFString::new("AXSubrole").as_concrete_TypeRef())
        {
            if &a == expected {
                score += 30;
            }
        }
    }

    if let Some(ref expected) = fp.ax_title {
        if let Some(a) = get_string_attribute(element, CFString::new("AXTitle").as_concrete_TypeRef())
        {
            if &a == expected {
                score += 40;
            }
        }
    }

    if let Some(ref expected) = fp.ax_description {
        if let Some(a) =
            get_string_attribute(element, CFString::new("AXDescription").as_concrete_TypeRef())
        {
            if &a == expected {
                score += 20;
            }
        }
    }

    if actual_index == fp.child_index {
        score += 5;
    }

    // Legacy bindings have no fingerprint signal at all — accept by index.
    if score == 0 {
        let any_signal = fp.ax_identifier.is_some()
            || fp.ax_role.is_some()
            || fp.ax_subrole.is_some()
            || fp.ax_title.is_some()
            || fp.ax_description.is_some();
        if !any_signal {
            return 1;
        }
    }

    score
}

pub fn focus_accessibility_field(
    app_pid: i32,
    element_index_path: &[usize],
    fingerprint_chain: Option<&[crate::commands::ElementFingerprint]>,
    _backend: Option<&str>,
    _jab_string_path: Option<&[crate::commands::JabElementId]>,
) -> Result<(), String> {
    let chain = fingerprint_chain.map(|c| c.to_vec());
    catch_unwind(AssertUnwindSafe(|| unsafe {
        focus_accessibility_field_impl(app_pid, element_index_path, chain.as_deref())
    }))
    .unwrap_or_else(|_| {
        log::error!("focus_accessibility_field panicked");
        Err("focus_accessibility_field panicked".to_string())
    })
}

unsafe fn focus_accessibility_field_impl(
    app_pid: i32,
    element_index_path: &[usize],
    fingerprint_chain: Option<&[crate::commands::ElementFingerprint]>,
) -> Result<(), String> {
    let ax_focused = CFString::new("AXFocused");
    let ax_value = CFString::new("AXValue");
    let ax_selected_text_range = CFString::new("AXSelectedTextRange");

    let app_element = AXUIElementCreateApplication(app_pid);
    if app_element.is_null() {
        return Err("Failed to create app element".to_string());
    }

    let raise_attr = CFString::new("AXFrontmost");
    let cf_true = core_foundation::boolean::CFBoolean::true_value();
    AXUIElementSetAttributeValue(
        app_element,
        raise_attr.as_concrete_TypeRef(),
        cf_true.as_CFTypeRef(),
    );
    CFRelease(app_element);

    let element = resolve_element(app_pid, element_index_path, fingerprint_chain)
        .ok_or_else(|| "Could not resolve element by path".to_string())?;

    let cf_true = core_foundation::boolean::CFBoolean::true_value();
    let focus_result = AXUIElementSetAttributeValue(
        element,
        ax_focused.as_concrete_TypeRef(),
        cf_true.as_CFTypeRef(),
    );
    if focus_result != AX_ERROR_SUCCESS {
        CFRelease(element);
        return Err(format!(
            "Failed to focus element: AX error {}",
            focus_result
        ));
    }

    let text_len = get_string_attribute(element, ax_value.as_concrete_TypeRef())
        .map(|s| s.len())
        .unwrap_or(0);

    if text_len > 0 {
        let position = (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos() as usize)
            % (text_len + 1);

        let range = CFRange {
            location: position as isize,
            length: 0,
        };
        let range_value = AXValueCreate(AX_VALUE_TYPE_CF_RANGE, &range);
        if !range_value.is_null() {
            AXUIElementSetAttributeValue(
                element,
                ax_selected_text_range.as_concrete_TypeRef(),
                range_value,
            );
            CFRelease(range_value);
        }
    }

    CFRelease(element);
    Ok(())
}

pub fn write_accessibility_fields(
    entries: Vec<crate::commands::AccessibilityWriteEntry>,
) -> crate::commands::AccessibilityWriteResult {
    catch_unwind(AssertUnwindSafe(|| unsafe {
        write_accessibility_fields_impl(entries)
    }))
    .unwrap_or_else(|_| {
        log::error!("write_accessibility_fields panicked");
        crate::commands::AccessibilityWriteResult {
            succeeded: 0,
            failed: 0,
            errors: vec!["write_accessibility_fields panicked".to_string()],
        }
    })
}

/// Resolve an element by walking the index path from the application root,
/// using `fingerprint_chain` (when present) to verify each level and to
/// recover when the recorded index now points at a different element. The
/// AX tree shifts in Java Swing apps between bind and sync; without a
/// fingerprint check we'd silently land on the wrong field.
///
/// `fingerprint_chain[i]` describes the element at `index_path[..=i]` —
/// they're built in the same order at bind time.
unsafe fn resolve_element(
    app_pid: i32,
    index_path: &[usize],
    fingerprint_chain: Option<&[crate::commands::ElementFingerprint]>,
) -> Option<CFTypeRef> {
    let app_element = AXUIElementCreateApplication(app_pid);
    if app_element.is_null() {
        return None;
    }

    let ax_children = CFString::new("AXChildren");
    let mut current = app_element;

    for (depth, &recorded_index) in index_path.iter().enumerate() {
        let fp = fingerprint_chain.and_then(|c| c.get(depth));

        let mut children_ref: CFTypeRef = ptr::null();
        let result = AXUIElementCopyAttributeValue(
            current,
            ax_children.as_concrete_TypeRef(),
            &mut children_ref,
        );
        if result != AX_ERROR_SUCCESS || children_ref.is_null() {
            if current != app_element {
                CFRelease(current);
            }
            CFRelease(app_element);
            return None;
        }

        let arr = children_ref as core_foundation::array::CFArrayRef;
        let count = CFArrayGetCount(arr) as usize;

        let mut chosen: Option<usize> = None;

        // Fast path: try the recorded index first, accept it if there's
        // either no fingerprint to check or the fingerprint scores > 0.
        if recorded_index < count {
            let candidate = CFArrayGetValueAtIndex(arr, recorded_index as isize);
            if !candidate.is_null() {
                let accept = match fp {
                    Some(fp) => fingerprint_score(candidate, fp, recorded_index) > 0,
                    None => true,
                };
                if accept {
                    chosen = Some(recorded_index);
                }
            }
        }

        // Fallback: scan siblings for the best fingerprint match. Only
        // runs when we have a fingerprint to score against.
        if chosen.is_none() {
            if let Some(fp) = fp {
                let mut best: Option<(u32, usize)> = None;
                for i in 0..count {
                    let candidate = CFArrayGetValueAtIndex(arr, i as isize);
                    if candidate.is_null() {
                        continue;
                    }
                    let score = fingerprint_score(candidate, fp, i);
                    if score > 0 && best.map_or(true, |(s, _)| score > s) {
                        best = Some((score, i));
                    }
                }
                chosen = best.map(|(_, i)| i);
            } else if recorded_index < count {
                chosen = Some(recorded_index);
            }
        }

        let Some(idx) = chosen else {
            CFRelease(children_ref);
            if current != app_element {
                CFRelease(current);
            }
            CFRelease(app_element);
            return None;
        };

        let child = CFArrayGetValueAtIndex(arr, idx as isize);
        if child.is_null() {
            CFRelease(children_ref);
            if current != app_element {
                CFRelease(current);
            }
            CFRelease(app_element);
            return None;
        }

        core_foundation::base::CFRetain(child);
        CFRelease(children_ref);

        if current != app_element {
            CFRelease(current);
        }
        current = child;
    }

    if current == app_element {
        CFRelease(app_element);
        return None;
    }

    CFRelease(app_element);
    Some(current)
}

unsafe fn write_accessibility_fields_impl(
    entries: Vec<crate::commands::AccessibilityWriteEntry>,
) -> crate::commands::AccessibilityWriteResult {
    let ax_value = CFString::new("AXValue");
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for entry in &entries {
        let element = resolve_element(
            entry.app_pid,
            &entry.element_index_path,
            entry.fingerprint_chain.as_deref(),
        );
        let Some(element) = element else {
            failed += 1;
            errors.push(format!(
                "Could not resolve element for PID {} path {:?}",
                entry.app_pid, entry.element_index_path
            ));
            continue;
        };

        let mut settable = false;
        AXUIElementIsAttributeSettable(element, ax_value.as_concrete_TypeRef(), &mut settable);

        let mut wrote = false;
        let mut ax_set_error: Option<String> = None;

        if settable {
            let cf_text = CFString::new(&entry.value);
            let set_result = AXUIElementSetAttributeValue(
                element,
                ax_value.as_concrete_TypeRef(),
                cf_text.as_CFTypeRef(),
            );
            if set_result == AX_ERROR_SUCCESS {
                wrote = true;
            } else {
                ax_set_error = Some(format!(
                    "AXUIElementSetAttributeValue failed with {}",
                    set_result
                ));
            }
        }

        CFRelease(element);

        // Java Swing (and a handful of other toolkits) report AXValue as
        // not-settable even when the field is editable. Fall back to a
        // focus + Cmd+A + Cmd+V clipboard paste — same approach Windows
        // uses for JAB ClipboardPaste.
        if !wrote {
            match clipboard_paste_into_element(
                entry.app_pid,
                &entry.element_index_path,
                entry.fingerprint_chain.as_deref(),
                &entry.value,
            ) {
                Ok(()) => wrote = true,
                Err(err) => {
                    let prefix = ax_set_error
                        .map(|e| format!("{e}; "))
                        .unwrap_or_else(|| "AXValue not settable; ".to_string());
                    errors.push(format!(
                        "{}clipboard paste failed for PID {} path {:?}: {}",
                        prefix, entry.app_pid, entry.element_index_path, err
                    ));
                }
            }
        }

        if wrote {
            succeeded += 1;
        } else {
            failed += 1;
        }
    }

    crate::commands::AccessibilityWriteResult {
        succeeded,
        failed,
        errors,
    }
}

/// Paste `value` into the element at `element_index_path` via Cmd+A + Cmd+V.
///
/// Re-resolves the element fresh after raising the app, because raising
/// invalidates any AXUIElement reference taken before activation (you'll see
/// kAXErrorInvalidUIElement / -25202 if you reuse the old handle).
///
/// Deliberately does NOT save/restore the clipboard: when multiple writes are
/// batched, a delayed restore would race with subsequent entries. The caller
/// (the JS layer) owns clipboard state.
unsafe fn clipboard_paste_into_element(
    app_pid: i32,
    element_index_path: &[usize],
    fingerprint_chain: Option<&[crate::commands::ElementFingerprint]>,
    value: &str,
) -> Result<(), String> {
    let app_element = AXUIElementCreateApplication(app_pid);
    if app_element.is_null() {
        return Err("could not create application element".to_string());
    }
    let raise_attr = CFString::new("AXFrontmost");
    let cf_true = core_foundation::boolean::CFBoolean::true_value();
    AXUIElementSetAttributeValue(
        app_element,
        raise_attr.as_concrete_TypeRef(),
        cf_true.as_CFTypeRef(),
    );
    CFRelease(app_element);

    // Let the activation propagate — the AX tree is rebuilt on raise, so any
    // pre-raise element reference is now stale.
    std::thread::sleep(std::time::Duration::from_millis(150));

    let element = resolve_element(app_pid, element_index_path, fingerprint_chain)
        .ok_or_else(|| "could not re-resolve element after raise".to_string())?;

    let ax_focused = CFString::new("AXFocused");
    let cf_true = core_foundation::boolean::CFBoolean::true_value();
    let focus_result = AXUIElementSetAttributeValue(
        element,
        ax_focused.as_concrete_TypeRef(),
        cf_true.as_CFTypeRef(),
    );
    CFRelease(element);
    // Don't fail hard on focus error — Java Swing returns errors here even
    // when the field is the active text component. Cmd+A / Cmd+V will land
    // wherever focus actually ended up.
    if focus_result != AX_ERROR_SUCCESS {
        log::warn!(
            "AXFocused set returned AX error {focus_result}; proceeding with paste anyway"
        );
    }

    let mut clipboard = arboard::Clipboard::new()
        .map_err(|err| format!("clipboard unavailable: {err}"))?;
    clipboard
        .set_text(value.to_string())
        .map_err(|err| format!("failed to set clipboard: {err}"))?;

    std::thread::sleep(std::time::Duration::from_millis(80));
    crate::platform::macos::input::simulate_cmd_a()
        .map_err(|err| format!("Cmd+A failed: {err}"))?;
    std::thread::sleep(std::time::Duration::from_millis(30));
    crate::platform::macos::input::simulate_cmd_v()
        .map_err(|err| format!("Cmd+V failed: {err}"))?;
    std::thread::sleep(std::time::Duration::from_millis(60));

    Ok(())
}

pub fn read_field_values(
    fields: Vec<crate::commands::FieldValueRequest>,
) -> Vec<crate::commands::FieldValueResult> {
    let len = fields.len();
    catch_unwind(AssertUnwindSafe(|| unsafe {
        read_field_values_impl(fields)
    }))
    .unwrap_or_else(|_| {
        log::error!("read_field_values panicked");
        (0..len)
            .map(|_| crate::commands::FieldValueResult {
                value: None,
                error: Some("read_field_values panicked".to_string()),
            })
            .collect()
    })
}

unsafe fn read_field_values_impl(
    fields: Vec<crate::commands::FieldValueRequest>,
) -> Vec<crate::commands::FieldValueResult> {
    let ax_value = CFString::new("AXValue");
    fields
        .into_iter()
        .map(|field| {
            let Some(element) = resolve_element(
                field.app_pid,
                &field.element_index_path,
                field.fingerprint_chain.as_deref(),
            ) else {
                return crate::commands::FieldValueResult {
                    value: None,
                    error: Some(format!(
                        "Could not resolve element for PID {} path {:?}",
                        field.app_pid, field.element_index_path
                    )),
                };
            };

            let value = get_string_attribute(element, ax_value.as_concrete_TypeRef());
            CFRelease(element);

            crate::commands::FieldValueResult {
                value: Some(value.unwrap_or_default()),
                error: None,
            }
        })
        .collect()
}

pub fn capture_app_identity(pid: i32) -> Option<crate::commands::AppIdentity> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};
    use std::ffi::CStr;
    use std::os::raw::c_char;

    catch_unwind(AssertUnwindSafe(|| unsafe {
        let pool: id = msg_send![class!(NSAutoreleasePool), new];
        let app: id = msg_send![
            class!(NSRunningApplication),
            runningApplicationWithProcessIdentifier: pid
        ];
        if app == nil {
            let _: () = msg_send![pool, drain];
            return None;
        }

        let bundle_id_ns: id = msg_send![app, bundleIdentifier];
        let bundle_id = if bundle_id_ns == nil {
            None
        } else {
            let utf8: *const c_char = msg_send![bundle_id_ns, UTF8String];
            if utf8.is_null() {
                None
            } else {
                Some(CStr::from_ptr(utf8).to_string_lossy().into_owned())
            }
        };

        let _: () = msg_send![pool, drain];

        if bundle_id.is_none() {
            return None;
        }

        Some(crate::commands::AppIdentity {
            exe_path: None,
            exe_name: None,
            bundle_id,
        })
    }))
    .unwrap_or(None)
}

pub fn resolve_app_pids(
    identity: &crate::commands::AppIdentity,
) -> Vec<crate::commands::AppProcessMatch> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};
    use std::ffi::CStr;
    use std::os::raw::c_char;

    let Some(expected_bundle) = identity.bundle_id.as_deref() else {
        return Vec::new();
    };

    catch_unwind(AssertUnwindSafe(|| unsafe {
        let pool: id = msg_send![class!(NSAutoreleasePool), new];
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let apps: id = msg_send![workspace, runningApplications];
        if apps == nil {
            let _: () = msg_send![pool, drain];
            return Vec::new();
        }

        let count: usize = msg_send![apps, count];
        let mut matches = Vec::new();
        for i in 0..count {
            let app: id = msg_send![apps, objectAtIndex: i];
            if app == nil {
                continue;
            }

            let bundle_ns: id = msg_send![app, bundleIdentifier];
            if bundle_ns == nil {
                continue;
            }
            let bundle_utf8: *const c_char = msg_send![bundle_ns, UTF8String];
            if bundle_utf8.is_null() {
                continue;
            }
            let bundle = CStr::from_ptr(bundle_utf8).to_string_lossy();
            if bundle != expected_bundle {
                continue;
            }

            let pid: i32 = msg_send![app, processIdentifier];
            let name_ns: id = msg_send![app, localizedName];
            let app_name = if name_ns == nil {
                None
            } else {
                let utf8: *const c_char = msg_send![name_ns, UTF8String];
                if utf8.is_null() {
                    None
                } else {
                    Some(CStr::from_ptr(utf8).to_string_lossy().into_owned())
                }
            };

            matches.push(crate::commands::AppProcessMatch {
                pid,
                exe_path: None,
                app_name,
                window_title: None,
            });
        }

        let _: () = msg_send![pool, drain];
        matches
    }))
    .unwrap_or_default()
}
