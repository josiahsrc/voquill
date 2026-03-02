// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod flavor_env;

/// Initialize X11 threading support on Linux.
///
/// This MUST be called before any X11 operations from any thread.
/// The application uses multiple threads that interact with X11:
/// - Tauri/GTK for the GUI
/// - rdev for global keyboard listening
/// - CPAL/ALSA for audio capture
///
/// Without XInitThreads, concurrent X11 access causes crashes.
#[cfg(target_os = "linux")]
fn init_x11_threads() {
    unsafe {
        x11::xlib::XInitThreads();
    }
}

#[cfg(not(target_os = "linux"))]
fn init_x11_threads() {}

#[cfg(unix)]
static HANDLING_FATAL_SIGNAL: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);
#[cfg(unix)]
static FATAL_CRASH_LOG_FD: std::sync::atomic::AtomicI32 = std::sync::atomic::AtomicI32::new(-1);
#[cfg(windows)]
static WINDOWS_CRASH_LOG_PATH_WIDE: std::sync::OnceLock<Vec<u16>> = std::sync::OnceLock::new();

#[cfg(unix)]
fn signal_name(signum: libc::c_int) -> &'static [u8] {
    match signum {
        libc::SIGSEGV => b"SIGSEGV",
        libc::SIGABRT => b"SIGABRT",
        libc::SIGILL => b"SIGILL",
        libc::SIGBUS => b"SIGBUS",
        libc::SIGFPE => b"SIGFPE",
        _ => b"UNKNOWN",
    }
}

#[cfg(unix)]
unsafe fn write_fd_signal_safe(fd: libc::c_int, message: &[u8]) {
    let _ = libc::write(fd, message.as_ptr().cast(), message.len());
}

#[cfg(unix)]
extern "C" fn handle_fatal_signal(signum: libc::c_int) {
    if HANDLING_FATAL_SIGNAL.swap(true, std::sync::atomic::Ordering::SeqCst) {
        unsafe {
            libc::_exit(128 + signum);
        }
    }

    unsafe {
        let crash_log_fd = FATAL_CRASH_LOG_FD.load(std::sync::atomic::Ordering::Relaxed);

        write_fd_signal_safe(libc::STDERR_FILENO, b"[crash] FATAL SIGNAL: ");
        write_fd_signal_safe(libc::STDERR_FILENO, signal_name(signum));
        write_fd_signal_safe(libc::STDERR_FILENO, b". Process will terminate.\n");

        if crash_log_fd >= 0 {
            write_fd_signal_safe(crash_log_fd, b"[crash] FATAL SIGNAL: ");
            write_fd_signal_safe(crash_log_fd, signal_name(signum));
            write_fd_signal_safe(crash_log_fd, b". Process will terminate.\n");
        }

        libc::signal(signum, libc::SIG_DFL);
        libc::raise(signum);
        libc::_exit(128 + signum);
    }
}

#[cfg(unix)]
fn install_native_crash_handlers() {
    use std::os::fd::IntoRawFd;

    let crash_log_path = std::env::temp_dir().join("voquill_native_crash.log");
    match std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&crash_log_path)
    {
        Ok(file) => {
            let fd = file.into_raw_fd();
            FATAL_CRASH_LOG_FD.store(fd, std::sync::atomic::Ordering::Relaxed);
            eprintln!(
                "[startup] Native crash logs will be written to {}",
                crash_log_path.display()
            );
        }
        Err(err) => {
            eprintln!(
                "[startup] WARN: Failed to open native crash log file {}: {err}",
                crash_log_path.display()
            );
        }
    }

    const FATAL_SIGNALS: [libc::c_int; 5] = [
        libc::SIGSEGV,
        libc::SIGABRT,
        libc::SIGILL,
        libc::SIGBUS,
        libc::SIGFPE,
    ];

    for signum in FATAL_SIGNALS {
        let result = unsafe { libc::signal(signum, handle_fatal_signal as libc::sighandler_t) };
        if result == libc::SIG_ERR {
            eprintln!("[startup] WARN: Failed to install crash handler for signal {signum}");
        }
    }
}

#[cfg(windows)]
fn append_bytes(buffer: &mut [u8], len: &mut usize, data: &[u8]) {
    let available = buffer.len().saturating_sub(*len);
    let to_copy = data.len().min(available);
    if to_copy == 0 {
        return;
    }
    buffer[*len..*len + to_copy].copy_from_slice(&data[..to_copy]);
    *len += to_copy;
}

#[cfg(windows)]
fn encode_hex_u32(value: u32) -> [u8; 10] {
    let mut out = [0u8; 10];
    out[0] = b'0';
    out[1] = b'x';
    for i in 0..8 {
        let shift = 28 - (i * 4);
        let nibble = ((value >> shift) & 0xF) as u8;
        out[2 + i] = match nibble {
            0..=9 => b'0' + nibble,
            _ => b'A' + (nibble - 10),
        };
    }
    out
}

#[cfg(windows)]
unsafe fn write_windows_crash_line(line: &[u8]) {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::Storage::FileSystem::{
        CreateFileW, FILE_APPEND_DATA, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ, FILE_SHARE_WRITE,
        OPEN_ALWAYS, WriteFile,
    };
    use windows::core::PCWSTR;

    let Some(path_wide) = WINDOWS_CRASH_LOG_PATH_WIDE.get() else {
        return;
    };

    let Ok(handle) = CreateFileW(
        PCWSTR(path_wide.as_ptr()),
        FILE_APPEND_DATA.0,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        None,
    ) else {
        return;
    };

    let mut written = 0u32;
    let _ = WriteFile(handle, Some(line), Some(&mut written), None);
    let _ = CloseHandle(handle);
}

#[cfg(windows)]
unsafe extern "system" fn handle_windows_unhandled_exception(
    exception_info: *const windows::Win32::System::Diagnostics::Debug::EXCEPTION_POINTERS,
) -> i32 {
    use windows::Win32::System::Diagnostics::Debug::EXCEPTION_EXECUTE_HANDLER;

    let mut exception_code = 0u32;
    if !exception_info.is_null() {
        let record = (*exception_info).ExceptionRecord;
        if !record.is_null() {
            exception_code = (*record).ExceptionCode.0 as u32;
        }
    }

    let mut line = [0u8; 96];
    let mut len = 0usize;
    append_bytes(&mut line, &mut len, b"[crash] UNHANDLED EXCEPTION ");
    append_bytes(&mut line, &mut len, &encode_hex_u32(exception_code));
    append_bytes(&mut line, &mut len, b". Process will terminate.\n");

    write_windows_crash_line(&line[..len]);
    EXCEPTION_EXECUTE_HANDLER
}

#[cfg(windows)]
fn install_native_crash_handlers() {
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::System::Diagnostics::Debug::SetUnhandledExceptionFilter;

    let crash_log_path = std::env::temp_dir().join("voquill_native_crash.log");
    let mut path_wide: Vec<u16> = crash_log_path.as_os_str().encode_wide().collect();
    path_wide.push(0);

    let _ = WINDOWS_CRASH_LOG_PATH_WIDE.set(path_wide);
    eprintln!(
        "[startup] Native crash logs will be written to {}",
        crash_log_path.display()
    );

    unsafe {
        let _ = SetUnhandledExceptionFilter(Some(handle_windows_unhandled_exception));
    }
}

#[cfg(all(not(unix), not(windows)))]
fn install_native_crash_handlers() {}

fn install_panic_hook() {
    let previous_hook = std::panic::take_hook();

    std::panic::set_hook(Box::new(move |panic_info| {
        let thread_name = std::thread::current()
            .name()
            .map(str::to_owned)
            .unwrap_or_else(|| "<unnamed>".to_string());
        let location = panic_info
            .location()
            .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
            .unwrap_or_else(|| "<unknown>".to_string());
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "<non-string payload>".to_string()
        };
        let backtrace = std::backtrace::Backtrace::force_capture();

        eprintln!("[crash] PANIC in thread '{thread_name}' at {location}: {message}");
        eprintln!("[crash] Backtrace:\n{backtrace}");

        log::error!(
            "PANIC in thread '{thread_name}' at {location}: {message}\nBacktrace:\n{backtrace}"
        );

        previous_hook(panic_info);
    }));
}

fn main() {
    install_panic_hook();
    install_native_crash_handlers();

    // CRITICAL: Initialize X11 threading before ANY other operations
    init_x11_threads();

    // Initialize startup logging
    eprintln!("=== Voquill Startup ===");
    eprintln!("[startup] Version: {}", env!("CARGO_PKG_VERSION"));
    eprintln!("[startup] OS: {}", std::env::consts::OS);
    eprintln!("[startup] Arch: {}", std::env::consts::ARCH);

    flavor_env::load_flavor_env();

    if std::env::var("VOQUILL_KEYBOARD_LISTENER").as_deref() == Ok("1") {
        eprintln!("[startup] Running in keyboard listener mode");
        if let Err(err) = desktop_lib::platform::keyboard::run_listener_process() {
            eprintln!("[startup] ERROR: Keyboard listener process failed: {err}");
            std::process::exit(1);
        }
        return;
    }

    if std::env::var("VOQUILL_GPU_ENUMERATOR").as_deref() == Ok("1") {
        eprintln!("[startup] Running in GPU enumerator mode");
        if let Err(err) = desktop_lib::system::gpu::run_gpu_enumerator_process() {
            eprintln!("[startup] ERROR: GPU enumerator process failed: {err}");
            std::process::exit(1);
        }
        return;
    }

    eprintln!("[startup] Building Tauri application...");

    let app_result =
        std::panic::catch_unwind(|| desktop_lib::app::build().run(tauri::generate_context!()));

    match app_result {
        Ok(result) => {
            if let Err(err) = result {
                let err_str = err.to_string();
                eprintln!("[startup] ERROR: Tauri runtime failure: {err}");

                // Provide context-specific guidance
                if err_str.contains("migration") {
                    eprintln!("[startup] This is a database migration issue.");
                    eprintln!("[startup] Try deleting the app database and restarting.");
                } else if err_str.contains("vulkan")
                    || err_str.contains("gpu")
                    || err_str.contains("GPU")
                {
                    eprintln!("[startup] This appears to be a GPU/graphics driver issue.");
                    eprintln!("[startup] Try setting VOQUILL_WHISPER_DISABLE_GPU=1 to disable GPU acceleration.");
                }
                std::process::exit(1);
            }
        }
        Err(_) => {
            eprintln!("[startup] PANIC: Application panicked during startup!");
            eprintln!("[startup] Panic details were logged by the global panic hook.");
            eprintln!("[startup] If this is a GPU-related crash, try setting VOQUILL_WHISPER_DISABLE_GPU=1");
            std::process::exit(1);
        }
    }
}
