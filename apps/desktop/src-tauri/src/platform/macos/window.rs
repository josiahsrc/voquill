use crate::platform::macos::dock;
use cocoa::appkit::{NSApp, NSApplication, NSWindow};
use cocoa::base::{id, nil, NO as COCOA_NO, YES};
use std::sync::mpsc;
use tauri::WebviewWindow;

const NS_FLOATING_WINDOW_LEVEL: i64 = 3;

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
                    ns_window.setLevel_(NS_FLOATING_WINDOW_LEVEL);
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

pub fn configure_overlay_non_activating(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    use objc::{msg_send, sel, sel_impl};

                    let ns_window = ns_window_ptr as id;

                    // NSWindowCollectionBehavior flags to prevent activation:
                    // - canJoinAllSpaces (1 << 0)
                    // - stationary (1 << 4) - window doesn't move with space switches
                    // - fullScreenAuxiliary (1 << 8) - auxiliary window for full screen
                    // - fullScreenDisallowsTiling (1 << 11)
                    let behavior: u64 = (1 << 0) | (1 << 4) | (1 << 8) | (1 << 11);
                    let _: () = msg_send![ns_window, setCollectionBehavior: behavior];

                    // Prevent the window from becoming key or main
                    let _: () = msg_send![ns_window, setHidesOnDeactivate: COCOA_NO];

                    // Set window to not activate app on click using private API
                    // _setPreventsActivation: is a private method but works reliably
                    let _: () = msg_send![ns_window, _setPreventsActivation: YES];
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to configure overlay on main thread".to_string())?
}
