use std::{env, mem, thread, time::Duration};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT,
    KEYEVENTF_KEYUP, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEINPUT, VIRTUAL_KEY,
    VK_CONTROL, VK_LCONTROL, VK_LMENU, VK_LSHIFT, VK_LWIN, VK_MENU, VK_RCONTROL, VK_RMENU,
    VK_RSHIFT, VK_RWIN, VK_SHIFT, VK_V,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
};

#[derive(Clone, Debug)]
pub struct WindowTargetInfo {
    pub class_name: Option<String>,
    pub title: Option<String>,
}

pub(crate) fn paste_text_into_focused_field(
    text: &str,
    keybind: Option<&str>,
) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let override_text = env::var("VOQUILL_DEBUG_PASTE_TEXT").ok();
    let target = override_text.as_deref().unwrap_or(text);
    log::info!(
        "attempting to inject text ({} chars)",
        target.chars().count()
    );

    paste_via_clipboard(target, keybind).or_else(|err| {
        log::warn!("Clipboard paste failed ({err}), falling back to simulated typing");
        use enigo::{Enigo, KeyboardControllable};
        let mut enigo = Enigo::new();
        release_modifier_keys();
        thread::sleep(Duration::from_millis(50));
        enigo.key_sequence(target);
        Ok(())
    })
}

fn is_console_window() -> bool {
    let target_info = get_foreground_window_target_info();
    if let Some(class_name) = target_info.class_name {
        log::debug!("foreground window class: {}", class_name);
        return class_name == "ConsoleWindowClass";
    }
    false
}

pub(crate) fn get_foreground_window_target_info() -> WindowTargetInfo {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return WindowTargetInfo {
                class_name: None,
                title: None,
            };
        }

        let mut class_name = [0u16; 256];
        let class_len = GetClassNameW(hwnd, &mut class_name);
        let class_name = if class_len > 0 {
            Some(String::from_utf16_lossy(&class_name[..class_len as usize]))
        } else {
            None
        };

        let title_len = GetWindowTextLengthW(hwnd);
        let title = if title_len > 0 {
            let mut title_buf = vec![0u16; title_len as usize + 1];
            let copied = GetWindowTextW(hwnd, &mut title_buf);
            if copied > 0 {
                Some(String::from_utf16_lossy(&title_buf[..copied as usize]))
            } else {
                None
            }
        } else {
            None
        };

        WindowTargetInfo { class_name, title }
    }
}

fn release_modifier_keys() {
    let win_held = is_key_pressed(VK_LWIN) || is_key_pressed(VK_RWIN);
    if win_held {
        cancel_pending_start_menu();
    }

    let modifiers = [
        VK_SHIFT,
        VK_CONTROL,
        VK_MENU,
        VK_LSHIFT,
        VK_RSHIFT,
        VK_LCONTROL,
        VK_RCONTROL,
        VK_LMENU,
        VK_RMENU,
        VK_LWIN,
        VK_RWIN,
    ];

    for vk in modifiers {
        if is_key_pressed(vk) {
            send_key_up(vk);
        }
    }
}

fn cancel_pending_start_menu() {
    let down = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(0xFF),
                wScan: 0,
                dwFlags: Default::default(),
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let up = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(0xFF),
                wScan: 0,
                dwFlags: KEYEVENTF_KEYUP,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[down, up], mem::size_of::<INPUT>() as i32);
    }
}

fn is_key_pressed(vk: VIRTUAL_KEY) -> bool {
    unsafe { GetAsyncKeyState(vk.0 as i32) < 0 }
}

fn send_key_down(vk: VIRTUAL_KEY) {
    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: Default::default(),
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[input], mem::size_of::<INPUT>() as i32);
    }
}

fn send_key_up(vk: VIRTUAL_KEY) {
    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: KEYEVENTF_KEYUP,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[input], mem::size_of::<INPUT>() as i32);
    }
}

fn send_right_click() {
    let down = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: MOUSEEVENTF_RIGHTDOWN,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let up = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: MOUSEEVENTF_RIGHTUP,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[down], mem::size_of::<INPUT>() as i32);
        thread::sleep(Duration::from_millis(10));
        SendInput(&[up], mem::size_of::<INPUT>() as i32);
    }
}

fn send_paste_keys(keybind: Option<&str>) {
    let is_console = is_console_window();

    let use_shift = keybind == Some("ctrl+shift+v");
    if is_console && !use_shift {
        log::info!("detected console window, using right-click to paste");
        send_right_click();
    } else {
        send_key_down(VK_CONTROL);
        if use_shift {
            send_key_down(VK_SHIFT);
        }
        send_key_down(VK_V);
        thread::sleep(Duration::from_millis(20));
        send_key_up(VK_V);
        if use_shift {
            send_key_up(VK_SHIFT);
        }
        send_key_up(VK_CONTROL);
    }
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(50));

    release_modifier_keys();
    thread::sleep(Duration::from_millis(30));

    send_paste_keys(keybind);

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        previous.restore();
    });

    Ok(())
}
