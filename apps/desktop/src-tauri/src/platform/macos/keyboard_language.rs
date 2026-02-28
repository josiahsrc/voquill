use core_foundation::array::CFArray;
use core_foundation::base::{CFType, TCFType};
use core_foundation::string::CFString;
use std::ffi::c_void;

#[link(name = "Carbon", kind = "framework")]
extern "C" {
    fn TISCopyCurrentKeyboardInputSource() -> *mut c_void;
    fn TISGetInputSourceProperty(source: *mut c_void, key: *const c_void) -> *mut c_void;
    static kTISPropertyInputSourceLanguages: *const c_void;
}

pub fn get_keyboard_language() -> Result<String, String> {
    unsafe {
        let source = TISCopyCurrentKeyboardInputSource();
        if source.is_null() {
            return Err("Failed to get keyboard input source".to_string());
        }

        let langs_ptr = TISGetInputSourceProperty(source, kTISPropertyInputSourceLanguages);
        if langs_ptr.is_null() {
            core_foundation::base::CFRelease(source);
            return Err("Failed to get input source languages".to_string());
        }

        let langs: CFArray<CFType> = CFArray::wrap_under_get_rule(langs_ptr as _);
        if langs.is_empty() {
            core_foundation::base::CFRelease(source);
            return Err("No languages found for input source".to_string());
        }

        let first = langs.get(0).unwrap();
        let cf_str: CFString = CFString::wrap_under_get_rule(first.as_CFTypeRef() as _);
        let result = cf_str.to_string();
        core_foundation::base::CFRelease(source);
        Ok(result)
    }
}
