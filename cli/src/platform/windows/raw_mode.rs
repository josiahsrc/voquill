use windows_sys::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE};
use windows_sys::Win32::System::Console::{
    DISABLE_NEWLINE_AUTO_RETURN, ENABLE_PROCESSED_OUTPUT, ENABLE_VIRTUAL_TERMINAL_INPUT,
    ENABLE_VIRTUAL_TERMINAL_PROCESSING, GetConsoleMode, GetStdHandle, STD_INPUT_HANDLE,
    STD_OUTPUT_HANDLE, SetConsoleMode,
};

pub struct RawModeGuard {
    stdin: HANDLE,
    stdout: HANDLE,
    orig_in: u32,
    orig_out: u32,
}

impl RawModeGuard {
    pub fn enable() -> Option<Self> {
        unsafe {
            let stdin = GetStdHandle(STD_INPUT_HANDLE);
            let stdout = GetStdHandle(STD_OUTPUT_HANDLE);
            if stdin.is_null() || stdin == INVALID_HANDLE_VALUE {
                return None;
            }
            if stdout.is_null() || stdout == INVALID_HANDLE_VALUE {
                return None;
            }

            let mut orig_in: u32 = 0;
            let mut orig_out: u32 = 0;
            if GetConsoleMode(stdin, &mut orig_in) == 0 {
                return None;
            }
            if GetConsoleMode(stdout, &mut orig_out) == 0 {
                return None;
            }

            let in_mode = ENABLE_VIRTUAL_TERMINAL_INPUT;
            let out_mode = ENABLE_PROCESSED_OUTPUT
                | ENABLE_VIRTUAL_TERMINAL_PROCESSING
                | DISABLE_NEWLINE_AUTO_RETURN;

            if SetConsoleMode(stdin, in_mode) == 0 {
                return None;
            }
            if SetConsoleMode(stdout, out_mode) == 0 {
                SetConsoleMode(stdin, orig_in);
                return None;
            }

            Some(Self {
                stdin,
                stdout,
                orig_in,
                orig_out,
            })
        }
    }
}

impl Drop for RawModeGuard {
    fn drop(&mut self) {
        unsafe {
            SetConsoleMode(self.stdin, self.orig_in);
            SetConsoleMode(self.stdout, self.orig_out);
        }
    }
}
