use portable_pty::PtySize;
use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
use windows_sys::Win32::System::Console::{
    CONSOLE_SCREEN_BUFFER_INFO, GetConsoleScreenBufferInfo, GetStdHandle, STD_OUTPUT_HANDLE,
};

pub fn terminal_size() -> Option<PtySize> {
    unsafe {
        let stdout = GetStdHandle(STD_OUTPUT_HANDLE);
        if stdout.is_null() || stdout == INVALID_HANDLE_VALUE {
            return None;
        }
        let mut csbi: CONSOLE_SCREEN_BUFFER_INFO = std::mem::zeroed();
        if GetConsoleScreenBufferInfo(stdout, &mut csbi) == 0 {
            return None;
        }
        let cols = (csbi.srWindow.Right - csbi.srWindow.Left + 1).max(0) as u16;
        let rows = (csbi.srWindow.Bottom - csbi.srWindow.Top + 1).max(0) as u16;
        Some(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
    }
}
