// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod flavor_env;

fn main() {
    flavor_env::load_flavor_env();

    if std::env::var("VOQUILL_KEYBOARD_LISTENER").as_deref() == Ok("1") {
        if let Err(err) = desktop_lib::platform::keyboard::run_listener_process() {
            eprintln!("Keyboard listener process failed: {err}");
            std::process::exit(1);
        }
        return;
    }

    desktop_lib::app::build()
        .run(tauri::generate_context!())
        .expect("tauri runtime failure");
}
