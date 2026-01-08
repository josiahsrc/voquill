use crate::platform::macos::dock;
use cocoa::appkit::{NSApp, NSApplication, NSWindow};
use cocoa::base::{id, nil, YES};
use std::sync::mpsc;
use tauri::WebviewWindow;

pub fn surface_main_window(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                if let Err(err) = dock::show_dock_icon() {
                    eprintln!("Failed to show dock icon: {err}");
                }

                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    let ns_window = ns_window_ptr as id;
                    let ns_app = NSApp();
                    if ns_app != nil {
                        NSApplication::activateIgnoringOtherApps_(ns_app, YES);
                    }

                    ns_window.deminiaturize_(nil);
                    ns_window.makeKeyWindow();
                    ns_window.orderFrontRegardless();
                }

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
                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    let ns_window = ns_window_ptr as id;
                    ns_window.setLevel_(cocoa::appkit::NSFloatingWindowLevel as i64);
                    ns_window.orderFrontRegardless();
                }

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
