use crate::domain::MonitorAtCursor;
use gtk::gdk;
use gtk::prelude::*;

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
