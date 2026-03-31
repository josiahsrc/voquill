use std::cell::Cell;
use std::ffi::{c_int, c_ulong, c_void};
use std::rc::Rc;
use std::time::Duration;

use gtk::gdk;
use gtk::glib::{self, ControlFlow};
use gtk::prelude::*;

use crate::constants::MARGIN_BOTTOM;

pub(crate) fn setup_x11_window(window: &gtk::Window) {
    use std::ffi::{c_char, c_int, c_uchar, c_uint, c_ulong, c_void};

    type XDisplay = c_void;
    type XWindow = c_ulong;
    type XAtom = c_ulong;

    const XA_ATOM: XAtom = 4;

    extern "C" {
        fn gdk_x11_display_get_xdisplay(display: *mut c_void) -> *mut XDisplay;
        fn gdk_x11_window_get_xid(window: *mut c_void) -> XWindow;
    }

    #[link(name = "X11")]
    extern "C" {
        fn XInternAtom(
            display: *mut XDisplay, name: *const c_char, only_if_exists: c_int,
        ) -> XAtom;
        fn XChangeProperty(
            display: *mut XDisplay, w: XWindow, property: XAtom, type_: XAtom,
            format: c_int, mode: c_int, data: *const c_uchar, nelements: c_int,
        ) -> c_int;
        fn XMoveWindow(display: *mut XDisplay, w: XWindow, x: c_int, y: c_int) -> c_int;
        fn XFlush(display: *mut XDisplay) -> c_int;
        fn XDefaultRootWindow(display: *mut XDisplay) -> XWindow;
        fn XQueryPointer(
            display: *mut XDisplay, w: XWindow,
            root_return: *mut XWindow, child_return: *mut XWindow,
            root_x_return: *mut c_int, root_y_return: *mut c_int,
            win_x_return: *mut c_int, win_y_return: *mut c_int,
            mask_return: *mut c_uint,
        ) -> c_int;
    }

    let display = window.display();
    let gdk_window = window.window().expect("window after realize");

    let xdisplay = unsafe {
        gdk_x11_display_get_xdisplay(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkDisplay>::to_glib_none(&display).0
                as *mut c_void,
        )
    };
    let xwindow = unsafe {
        gdk_x11_window_get_xid(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkWindow>::to_glib_none(&gdk_window).0
                as *mut c_void,
        )
    };

    unsafe {
        let intern = |name: &[u8]| -> XAtom {
            XInternAtom(xdisplay, name.as_ptr() as *const c_char, 0)
        };

        let wm_window_type = intern(b"_NET_WM_WINDOW_TYPE\0");
        let type_dock = intern(b"_NET_WM_WINDOW_TYPE_DOCK\0");
        XChangeProperty(
            xdisplay, xwindow, wm_window_type, XA_ATOM, 32, 0,
            &type_dock as *const XAtom as *const c_uchar, 1,
        );

        let wm_state = intern(b"_NET_WM_STATE\0");
        let states = [
            intern(b"_NET_WM_STATE_ABOVE\0"),
            intern(b"_NET_WM_STATE_STICKY\0"),
            intern(b"_NET_WM_STATE_SKIP_TASKBAR\0"),
            intern(b"_NET_WM_STATE_SKIP_PAGER\0"),
        ];
        XChangeProperty(
            xdisplay, xwindow, wm_state, XA_ATOM, 32, 0,
            states.as_ptr() as *const c_uchar, states.len() as c_int,
        );

        XFlush(xdisplay);
    }

    let cursor_pos = move || -> (c_int, c_int) {
        unsafe {
            let root = XDefaultRootWindow(xdisplay);
            let (mut rx, mut ry) = (0 as c_int, 0 as c_int);
            let (mut dw1, mut dw2) = (0 as XWindow, 0 as XWindow);
            let (mut dx, mut dy) = (0 as c_int, 0 as c_int);
            let mut dm: c_uint = 0;
            XQueryPointer(
                xdisplay, root, &mut dw1, &mut dw2,
                &mut rx, &mut ry, &mut dx, &mut dy, &mut dm,
            );
            (rx, ry)
        }
    };

    let win_ref = window.clone();
    let pill_pos_on_monitor =
        move |cx: c_int, cy: c_int, disp: &gdk::Display| -> Option<(c_int, c_int)> {
            let n = disp.n_monitors();
            for i in 0..n {
                let monitor = disp.monitor(i)?;
                let g = monitor.geometry();
                let scale = monitor.scale_factor() as f64;
                let phys_x = g.x() as f64 * scale;
                let phys_y = g.y() as f64 * scale;
                let phys_w = g.width() as f64 * scale;
                let phys_h = g.height() as f64 * scale;
                if (cx as f64) >= phys_x && (cx as f64) < phys_x + phys_w
                    && (cy as f64) >= phys_y && (cy as f64) < phys_y + phys_h
                {
                    let wa = monitor.workarea();
                    let wa_x = wa.x() as f64 * scale;
                    let wa_y = wa.y() as f64 * scale;
                    let wa_w = wa.width() as f64 * scale;
                    let wa_h = wa.height() as f64 * scale;
                    let (alloc_w, alloc_h) = win_ref.size();
                    let win_w = alloc_w as f64;
                    let win_h = alloc_h as f64;
                    let margin = MARGIN_BOTTOM as f64 * scale;
                    return Some((
                        (wa_x + (wa_w - win_w) / 2.0) as c_int,
                        (wa_y + wa_h - win_h - margin) as c_int,
                    ));
                }
            }
            None
        };

    let (cx, cy) = cursor_pos();
    let init_pos = pill_pos_on_monitor(cx, cy, &display).unwrap_or((0, 0));
    unsafe {
        XMoveWindow(xdisplay, xwindow, init_pos.0, init_pos.1);
        XFlush(xdisplay);
    }

    let last_pos = Rc::new(Cell::new(init_pos));
    glib::timeout_add_local(Duration::from_millis(100), move || {
        let (cx, cy) = cursor_pos();
        if let Some((new_x, new_y)) = pill_pos_on_monitor(cx, cy, &display) {
            let prev = last_pos.get();
            if new_x != prev.0 || new_y != prev.1 {
                last_pos.set((new_x, new_y));
                unsafe {
                    XMoveWindow(xdisplay, xwindow, new_x, new_y);
                    XFlush(xdisplay);
                }
            }
        }
        ControlFlow::Continue
    });
}

pub(crate) fn force_keyboard_focus(window: &gtk::Window) {
    type XDisplay = c_void;
    type XWindow = c_ulong;

    extern "C" {
        fn gdk_x11_display_get_xdisplay(display: *mut c_void) -> *mut XDisplay;
        fn gdk_x11_window_get_xid(window: *mut c_void) -> XWindow;
    }

    #[link(name = "X11")]
    extern "C" {
        fn XSetInputFocus(
            display: *mut XDisplay, focus: XWindow, revert_to: c_int, time: c_ulong,
        ) -> c_int;
        fn XFlush(display: *mut XDisplay) -> c_int;
    }

    let gdk_window = match window.window() {
        Some(w) if w.is_visible() => w,
        _ => return,
    };
    let display = window.display();

    unsafe {
        let xdisplay = gdk_x11_display_get_xdisplay(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkDisplay>::to_glib_none(&display).0
                as *mut c_void,
        );
        let xwindow = gdk_x11_window_get_xid(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkWindow>::to_glib_none(&gdk_window).0
                as *mut c_void,
        );
        XSetInputFocus(xdisplay, xwindow, 1, 0);
        XFlush(xdisplay);
    }
}
