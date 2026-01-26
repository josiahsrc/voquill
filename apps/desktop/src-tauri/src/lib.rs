pub mod app;
pub mod commands;
pub mod db;
pub mod domain;
pub mod errors;
pub mod overlay;
pub mod platform;
pub mod state;
pub mod system;

pub fn run() {
    app::build()
        .run(tauri::generate_context!())
        .expect("tauri runtime failure");
}
