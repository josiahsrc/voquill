use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;

#[link(name = "user32")]
extern "system" {
    fn GetForegroundWindow() -> isize;
    fn GetWindowThreadProcessId(hwnd: isize, process_id: *mut u32) -> u32;
    fn GetKeyboardLayout(thread_id: u32) -> isize;
}

#[link(name = "kernel32")]
extern "system" {
    fn GetLocaleInfoW(locale: u32, lc_type: u32, data: *mut u16, data_size: i32) -> i32;
}

pub fn get_keyboard_language() -> Result<String, String> {
    unsafe {
        let hwnd = GetForegroundWindow();
        let thread_id = GetWindowThreadProcessId(hwnd, std::ptr::null_mut());
        let hkl = GetKeyboardLayout(thread_id);

        let lang_id = (hkl as u32) & 0xFFFF;

        const LOCALE_SISO639LANGNAME: u32 = 0x00000059;
        let mut buf = [0u16; 16];
        let len = GetLocaleInfoW(
            lang_id,
            LOCALE_SISO639LANGNAME,
            buf.as_mut_ptr(),
            buf.len() as i32,
        );

        if len == 0 {
            return Err(format!(
                "Failed to get locale language name for lang_id 0x{:04X}",
                lang_id
            ));
        }

        let os_str = OsString::from_wide(&buf[..(len as usize - 1)]);
        os_str
            .into_string()
            .map_err(|_| "Failed to convert language name to string".to_string())
    }
}
