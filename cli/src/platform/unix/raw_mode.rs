pub struct RawModeGuard {
    fd: libc::c_int,
    orig: libc::termios,
}

impl RawModeGuard {
    pub fn enable() -> Option<Self> {
        unsafe {
            let fd = libc::STDIN_FILENO;
            let mut orig: libc::termios = std::mem::zeroed();
            if libc::tcgetattr(fd, &mut orig) != 0 {
                return None;
            }
            let mut raw = orig;
            libc::cfmakeraw(&mut raw);
            if libc::tcsetattr(fd, libc::TCSANOW, &raw) != 0 {
                return None;
            }
            Some(Self { fd, orig })
        }
    }
}

impl Drop for RawModeGuard {
    fn drop(&mut self) {
        unsafe {
            libc::tcsetattr(self.fd, libc::TCSANOW, &self.orig);
        }
    }
}
