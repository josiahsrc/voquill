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
