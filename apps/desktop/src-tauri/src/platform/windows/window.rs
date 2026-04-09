use std::sync::mpsc;
use tauri::{Manager, WebviewWindow};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, SetForegroundWindow, SetWindowPos, ShowWindow, HWND_NOTOPMOST, HWND_TOPMOST,
    SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE, SW_SHOW,
};

/// Keep the WebView2 rendering active after the host window is hidden.
///
/// When Tauri hides the OS window, WebView2 may internally suspend the
/// renderer and stop dispatching IPC messages to JavaScript. This forces the
/// controller's `IsVisible` flag back to `true` so background JS (e.g. global
/// hotkey detection via `keys_held` events) keeps running while the app sits
/// in the system tray.
pub fn keep_webview_active(app_handle: &tauri::AppHandle, label: &str) {
    if let Some(ww) = app_handle.get_webview_window(label) {
        let _ = ww.with_webview(|webview| unsafe {
            let _ = webview.controller().SetIsVisible(true);
        });
    }
}

pub fn surface_main_window(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let hwnd: HWND = window_for_handle.hwnd().map_err(|err| err.to_string())?;

                unsafe {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                    let _ = ShowWindow(hwnd, SW_SHOW);
                    let _ = SetForegroundWindow(hwnd);
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_TOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                    );
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_NOTOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
                    );
                    let _ = BringWindowToTop(hwnd);
                }

                if let Err(err) = window_for_handle.unminimize() {
                    log::error!("Failed to unminimize window: {err}");
                }
                if let Err(err) = window_for_handle.show() {
                    log::error!("Failed to show window: {err}");
                }
                if let Err(err) = window_for_handle.set_focus() {
                    log::error!("Failed to focus window: {err}");
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to surface window on main thread".to_string())?
}
