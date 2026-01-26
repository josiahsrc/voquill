use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::mpsc;
use tauri::WebviewWindow;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, GetForegroundWindow, GetWindowLongW, SetForegroundWindow, SetWindowLongW,
    SetWindowPos, ShowWindow, GWL_EXSTYLE, HWND_NOTOPMOST, HWND_TOPMOST, LWA_ALPHA,
    SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE, SW_SHOW,
    SW_SHOWNOACTIVATE, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TRANSPARENT,
};

fn set_layered_window_attributes(hwnd: HWND, alpha: u8) {
    use windows::Win32::UI::WindowsAndMessaging::SetLayeredWindowAttributes;
    unsafe {
        let _ = SetLayeredWindowAttributes(hwnd, windows::Win32::Foundation::COLORREF(0), alpha, LWA_ALPHA);
    }
}

static SAVED_FOREGROUND_HWND: AtomicIsize = AtomicIsize::new(0);

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
                let hwnd: HWND = window_for_handle.hwnd().map_err(|err| err.to_string())?;

                unsafe {
                   let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
                   let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_TOPMOST),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                    );
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

pub fn set_overlay_click_through(window: &WebviewWindow, click_through: bool) -> Result<(), String> {
    if !click_through {
        save_foreground_window();
    }

    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let hwnd: HWND = window_for_handle.hwnd().map_err(|err| err.to_string())?;

                unsafe {
                    let current_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

                    let new_style = if click_through {
                        current_style | WS_EX_TRANSPARENT.0 as i32 | WS_EX_LAYERED.0 as i32
                    } else {
                        current_style & !(WS_EX_TRANSPARENT.0 as i32)
                    };

                    if new_style != current_style {
                        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);

                        if click_through {
                            set_layered_window_attributes(hwnd, 255);
                        }

                        SetWindowPos(
                            hwnd,
                            Some(HWND_TOPMOST),
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                        );
                    }
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to set overlay click through on main thread".to_string())?
}

pub fn configure_overlay_non_activating(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let hwnd: HWND = window_for_handle.hwnd().map_err(|err| err.to_string())?;

                unsafe {
                    let current_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    let new_style = current_style | WS_EX_NOACTIVATE.0 as i32;

                    if new_style != current_style {
                        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);
                        SetWindowPos(
                            hwnd,
                            Some(HWND_TOPMOST),
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                        );
                    }
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to configure overlay as non-activating on main thread".to_string())?
}

pub fn save_foreground_window() {
    let hwnd = unsafe { GetForegroundWindow() };
    SAVED_FOREGROUND_HWND.store(hwnd.0 as isize, Ordering::SeqCst);
}

pub fn restore_foreground_window() {
    let hwnd_value = SAVED_FOREGROUND_HWND.load(Ordering::SeqCst);
    if hwnd_value != 0 {
        let hwnd = HWND(hwnd_value as *mut _);
        unsafe {
            let _ = SetForegroundWindow(hwnd);
        }
    }
}
