use crate::domain::{MonitorAtCursor, OverlayAnchor};
use tauri::WebviewWindow;

pub fn set_overlay_position(
    window: &WebviewWindow,
    monitor: &MonitorAtCursor,
    anchor: OverlayAnchor,
    window_width: f64,
    window_height: f64,
    margin: f64,
) {
    let (target_x, target_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = monitor.visible_x + (monitor.visible_width - window_width) / 2.0;
            let y = monitor.visible_y + monitor.visible_height - window_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = monitor.visible_x + monitor.visible_width - window_width - margin;
            let y = monitor.visible_y + margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = monitor.visible_x + margin;
            let y = monitor.visible_y + margin;
            (x, y)
        }
    };

    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
        target_x, target_y,
    )));
}

pub fn is_cursor_in_bounds(
    monitor: &MonitorAtCursor,
    anchor: OverlayAnchor,
    bounds_width: f64,
    bounds_height: f64,
    margin: f64,
) -> bool {
    // GDK returns coordinates in logical (application) pixels already,
    // so we use them directly without dividing by scale
    let visible_x = monitor.visible_x;
    let visible_y = monitor.visible_y;
    let visible_width = monitor.visible_width;
    let visible_height = monitor.visible_height;

    // Calculate bounds position based on anchor (same logic as set_overlay_position)
    let (bounds_x, bounds_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = visible_x + (visible_width - bounds_width) / 2.0;
            let y = visible_y + visible_height - bounds_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = visible_x + visible_width - bounds_width - margin;
            let y = visible_y + margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = visible_x + margin;
            let y = visible_y + margin;
            (x, y)
        }
    };

    // GDK cursor coordinates are also in logical pixels
    let cursor_x = monitor.cursor_x;
    let cursor_y = monitor.cursor_y;

    cursor_x >= bounds_x
        && cursor_x <= bounds_x + bounds_width
        && cursor_y >= bounds_y
        && cursor_y <= bounds_y + bounds_height
}
