// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod flavor_env;

fn main() {
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

    eprintln!("[startup] Building Tauri application...");

    let app_result = std::panic::catch_unwind(|| {
        desktop_lib::app::build()
            .run(tauri::generate_context!())
    });

    match app_result {
        Ok(result) => {
            if let Err(err) = result {
                eprintln!("[startup] ERROR: Tauri runtime failure: {err}");
                eprintln!("[startup] This may be caused by GPU/graphics driver issues.");
                eprintln!("[startup] Try setting VOQUILL_WHISPER_DISABLE_GPU=1 to disable GPU acceleration.");
                std::process::exit(1);
            }
        }
        Err(panic_info) => {
            eprintln!("[startup] PANIC: Application panicked during startup!");
            if let Some(s) = panic_info.downcast_ref::<&str>() {
                eprintln!("[startup] Panic message: {s}");
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                eprintln!("[startup] Panic message: {s}");
            } else {
                eprintln!("[startup] Panic message: <unknown>");
            }
            eprintln!("[startup] This may be caused by GPU/graphics driver issues on AMD cards.");
            eprintln!("[startup] Try setting VOQUILL_WHISPER_DISABLE_GPU=1 to disable GPU acceleration.");
            std::process::exit(1);
        }
    }
}
