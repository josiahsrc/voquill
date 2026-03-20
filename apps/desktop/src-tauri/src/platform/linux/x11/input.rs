use enigo::{Enigo, Key, KeyboardControllable};
use std::{ffi::CStr, ptr, thread, time::Duration};
use x11::xlib;

pub fn paste_text(text: &str, keybind: Option<&str>) -> Result<(), String> {
    paste_via_clipboard(text, keybind).or_else(|err| {
        log::warn!("Clipboard paste failed ({err}), falling back to simulated typing");
        enigo_type_text(text)
    })
}

fn enigo_type_text(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));
    enigo.key_sequence(text);
    Ok(())
}

fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(40));

    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));

    let use_shift = match keybind {
        Some(kb) => kb == "ctrl+shift+v",
        None => is_ctrl_shift_v_window(),
    };

    enigo.key_down(Key::Control);
    if use_shift {
        enigo.key_down(Key::Shift);
    }
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    if use_shift {
        enigo.key_up(Key::Shift);
    }
    enigo.key_up(Key::Control);

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        previous.restore();
    });

    Ok(())
}

const CTRL_SHIFT_V_WM_CLASSES: &[&str] = &[
    "gnome-terminal",
    "xterm",
    "kitty",
    "alacritty",
    "konsole",
    "xfce4-terminal",
    "terminator",
    "tilix",
    "urxvt",
    "rxvt",
    "st",
    "foot",
    "sakura",
    "terminology",
    "wezterm",
    "guake",
    "tilda",
    "yakuake",
    "rio",
    "cool-retro-term",
    "lxterminal",
    "mate-terminal",
    "deepin-terminal",
    "qterminal",
    "eterm",
    "aterm",
    "blackbox-terminal",
    "contour",
    "code",
    "code-insiders",
    "codium",
    "vscodium",
];

fn is_ctrl_shift_v_window() -> bool {
    let Some((res_name, res_class)) = get_focused_wm_class() else {
        return false;
    };

    log::debug!(
        "focused window class: res_name={}, res_class={}",
        res_name,
        res_class
    );

    let name_lower = res_name.to_ascii_lowercase();
    let class_lower = res_class.to_ascii_lowercase();

    CTRL_SHIFT_V_WM_CLASSES
        .iter()
        .any(|t| name_lower == *t || class_lower == *t)
}

fn get_focused_wm_class() -> Option<(String, String)> {
    unsafe {
        let display = xlib::XOpenDisplay(ptr::null());
        if display.is_null() {
            return None;
        }

        let result = (|| {
            let mut focused: xlib::Window = 0;
            let mut revert: i32 = 0;
            xlib::XGetInputFocus(display, &mut focused, &mut revert);

            if focused == 0 || focused == 1 {
                return None;
            }

            let mut window = focused;
            for _ in 0..16 {
                let mut class_hint = xlib::XClassHint {
                    res_name: ptr::null_mut(),
                    res_class: ptr::null_mut(),
                };

                if xlib::XGetClassHint(display, window, &mut class_hint) != 0 {
                    let res_name = if class_hint.res_name.is_null() {
                        String::new()
                    } else {
                        let s = CStr::from_ptr(class_hint.res_name)
                            .to_string_lossy()
                            .into_owned();
                        xlib::XFree(class_hint.res_name as *mut _);
                        s
                    };

                    let res_class = if class_hint.res_class.is_null() {
                        String::new()
                    } else {
                        let s = CStr::from_ptr(class_hint.res_class)
                            .to_string_lossy()
                            .into_owned();
                        xlib::XFree(class_hint.res_class as *mut _);
                        s
                    };

                    if !res_name.is_empty() || !res_class.is_empty() {
                        return Some((res_name, res_class));
                    }
                }

                let mut root: xlib::Window = 0;
                let mut parent: xlib::Window = 0;
                let mut children: *mut xlib::Window = ptr::null_mut();
                let mut n_children: u32 = 0;

                if xlib::XQueryTree(
                    display,
                    window,
                    &mut root,
                    &mut parent,
                    &mut children,
                    &mut n_children,
                ) == 0
                {
                    return None;
                }

                if !children.is_null() {
                    xlib::XFree(children as *mut _);
                }

                if parent == root || parent == 0 {
                    return None;
                }

                window = parent;
            }

            None
        })();

        xlib::XCloseDisplay(display);
        result
    }
}
