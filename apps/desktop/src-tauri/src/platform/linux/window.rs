use gtk::gdk::ffi::GDK_CURRENT_TIME;
use gtk::prelude::*;
use std::sync::mpsc;
use tauri::WebviewWindow;

pub fn surface_main_window(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let gtk_window = window_for_handle
                    .gtk_window()
                    .map_err(|err| err.to_string())?;

                gtk_window.deiconify();
                gtk_window.present();
                gtk_window.present_with_time(GDK_CURRENT_TIME as u32);
                gtk_window.set_keep_above(true);
                gtk_window.set_keep_above(false);

                if let Err(err) = window_for_handle.unminimize() {
                    eprintln!("Failed to unminimize window: {err}");
                }
                if let Err(err) = window_for_handle.show() {
                    eprintln!("Failed to show window: {err}");
                }
                if let Err(err) = window_for_handle.set_focus() {
                    eprintln!("Failed to focus window: {err}");
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    let result = rx
        .recv()
        .map_err(|_| "failed to surface window on main thread".to_string())?;

    result
}

pub fn show_overlay_no_focus(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let gtk_window = window_for_handle
                    .gtk_window()
                    .map_err(|err| err.to_string())?;

                gtk_window.set_accept_focus(false);
                gtk_window.set_focus_on_map(false);
                gtk_window.set_keep_above(true);
                gtk_window.show_all();

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    let result = rx
        .recv()
        .map_err(|_| "failed to show overlay on main thread".to_string())?;

    result
}

pub fn configure_overlay_non_activating(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let gtk_window = window_for_handle
                    .gtk_window()
                    .map_err(|err| err.to_string())?;

                gtk_window.set_accept_focus(false);
                gtk_window.set_focus_on_map(false);

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to configure overlay as non-activating on main thread".to_string())?
}
