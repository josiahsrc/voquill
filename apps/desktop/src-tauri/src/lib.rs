pub mod app;
pub mod commands;
pub mod db;
pub mod domain;
pub mod errors;
pub mod overlay;
pub mod pill_process;
pub mod platform;
pub mod state;
pub mod system;
pub mod utils;

pub fn run() {
    app::run(tauri::generate_context!()).expect("tauri runtime failure");
}
