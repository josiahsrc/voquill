// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    desktop_lib::app::build()
        .run(tauri::generate_context!())
        .expect("tauri runtime failure");
}
