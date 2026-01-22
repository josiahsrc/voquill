use crate::domain::MonitorAtCursor;
use gtk::gdk;
use gtk::prelude::*;

const DEFAULT_BOTTOM_OFFSET: f64 = 48.0;
const TASKBAR_PADDING: f64 = 8.0;

pub fn get_bottom_offset() -> f64 {
    let Some(display) = gdk::Display::default() else {
        return DEFAULT_BOTTOM_OFFSET;
    };

    let Some(seat) = display.default_seat() else {
        return DEFAULT_BOTTOM_OFFSET;
    };

    let Some(pointer) = seat.pointer() else {
        return DEFAULT_BOTTOM_OFFSET;
    };

    let (_, x, y) = pointer.position();

    let Some(monitor) = display.monitor_at_point(x, y) else {
        return DEFAULT_BOTTOM_OFFSET;
    };

    let geometry = monitor.geometry();
    let workarea = monitor.workarea();

    let screen_bottom = geometry.y() + geometry.height();
    let workarea_bottom = workarea.y() + workarea.height();
    let bottom_inset = (screen_bottom - workarea_bottom) as f64;

    if bottom_inset > 1.0 {
        bottom_inset + TASKBAR_PADDING
    } else {
        DEFAULT_BOTTOM_OFFSET
    }
}

pub fn get_monitor_at_cursor() -> Option<MonitorAtCursor> {
    let display = gdk::Display::default()?;
    let seat = display.default_seat()?;
    let pointer = seat.pointer()?;

    let (_, x, y) = pointer.position();

    let monitor = display.monitor_at_point(x, y)?;
    let geometry = monitor.geometry();
    let workarea = monitor.workarea();
    let scale_factor = monitor.scale_factor() as f64;

    Some(MonitorAtCursor {
        x: geometry.x() as f64,
        y: geometry.y() as f64,
        width: geometry.width() as f64,
        height: geometry.height() as f64,
        visible_x: workarea.x() as f64,
        visible_y: workarea.y() as f64,
        visible_width: workarea.width() as f64,
        visible_height: workarea.height() as f64,
        scale_factor,
        cursor_x: x as f64,
        cursor_y: y as f64,
    })
}
