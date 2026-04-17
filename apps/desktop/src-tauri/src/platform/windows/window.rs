use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;
use tauri::{Manager, WebviewWindow};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, SetForegroundWindow, SetWindowPos, ShowWindow, HWND_NOTOPMOST, HWND_TOPMOST,
    SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE, SW_SHOW,
};

static WEBVIEW_KEEPALIVE_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Starts a background thread that periodically re-asserts WebView visibility
/// while the hosting window is unfocused or hidden. This counters WebView2's
/// automatic occlusion detection which would otherwise freeze JS execution and
/// IPC event delivery when the window is covered by another window—breaking
/// global hotkey detection.
pub fn start_webview_keepalive(app_handle: &tauri::AppHandle) {
    static STARTED: OnceLock<()> = OnceLock::new();
    let handle = app_handle.clone();
    STARTED.get_or_init(|| {
        thread::spawn(move || loop {
            thread::sleep(Duration::from_millis(500));
            if WEBVIEW_KEEPALIVE_ACTIVE.load(Ordering::Relaxed) {
                keep_webview_active(&handle, "main");
            }
        });
    });
}

pub fn set_webview_keepalive(active: bool) {
    WEBVIEW_KEEPALIVE_ACTIVE.store(active, Ordering::Relaxed);
}

/// Keep the WebView2 rendering active after the host window is hidden.
///
/// When Tauri hides the OS window, WebView2 may internally suspend the
/// renderer and stop dispatching IPC messages to JavaScript. This forces the
/// controller's `IsVisible` flag back to `true` so background JS (e.g. global
/// hotkey detection via `keys_held` events) keeps running while the app sits
/// in the system tray.
///
/// IMPORTANT: WebView2 COM interfaces must be accessed from the main thread.
/// Using `run_on_main_thread` ensures the `SetIsVisible` call actually takes
/// effect instead of silently failing from a background thread.
pub fn keep_webview_active(app_handle: &tauri::AppHandle, label: &str) {
    if let Some(ww) = app_handle.get_webview_window(label) {
        let window_for_main_thread = ww.clone();
        if let Err(err) = ww.run_on_main_thread(move || {
            if let Err(err) = window_for_main_thread.with_webview(|webview| unsafe {
                if let Err(err) = webview.controller().SetIsVisible(true) {
                    log::error!("Failed to keep WebView active: {err}");
                }
            }) {
                log::error!("Failed to access WebView for keepalive: {err}");
            }
        }) {
            log::error!("Failed to schedule WebView keepalive: {err}");
        }
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

pub fn find_pid_by_window_title(title_substring: &str) -> Option<i32> {
    use windows::Win32::UI::WindowsAndMessaging::{
        FindWindowExW, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
        IsWindowVisible,
    };

    let needle = title_substring.to_lowercase();

    unsafe {
        let mut hwnd = match FindWindowExW(None, None, None, None) {
            Ok(h) => h,
            Err(_) => return None,
        };
        loop {
            if IsWindowVisible(hwnd).as_bool() {
                let len = GetWindowTextLengthW(hwnd);
                if len > 0 {
                    let mut buf = vec![0u16; (len + 1) as usize];
                    let got = GetWindowTextW(hwnd, &mut buf);
                    if got > 0 {
                        let title = String::from_utf16_lossy(&buf[..got as usize]);
                        if title.to_lowercase().contains(&needle) {
                            let mut pid: u32 = 0;
                            GetWindowThreadProcessId(hwnd, Some(&mut pid));
                            if pid > 0 {
                                return Some(pid as i32);
                            }
                        }
                    }
                }
            }
            match FindWindowExW(None, Some(hwnd), None, None) {
                Ok(next) => hwnd = next,
                Err(_) => break,
            }
        }
    }
    None
}
