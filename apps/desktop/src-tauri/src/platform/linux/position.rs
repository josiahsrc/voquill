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
    // Linux (GTK/GDK) uses standard screen coordinates (same as Windows):
    // - Y=0 is at the top
    // - Y increases downward
    // - Window position is the top-left corner
    //
    // Monitor values may be in application units, convert to logical for calculation
    let scale = monitor.scale_factor;

    let visible_x = monitor.visible_x / scale;
    let visible_y = monitor.visible_y / scale;
    let visible_width = monitor.visible_width / scale;
    let visible_height = monitor.visible_height / scale;

    let (target_x, target_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = visible_x + (visible_width - window_width) / 2.0;
            let y = visible_y + visible_height - window_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = visible_x + visible_width - window_width - margin;
            let y = visible_y + margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = visible_x + margin;
            let y = visible_y + margin;
            (x, y)
        }
    };

    // Convert back to physical pixels
    let physical_x = (target_x * scale) as i32;
    let physical_y = (target_y * scale) as i32;

    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
        physical_x, physical_y,
    )));
}

pub fn is_cursor_in_bounds(
    monitor: &MonitorAtCursor,
    anchor: OverlayAnchor,
    bounds_width: f64,
    bounds_height: f64,
    margin: f64,
) -> bool {
    // Linux monitor values may be scaled, convert to logical
    let scale = monitor.scale_factor;

    let visible_x = monitor.visible_x / scale;
    let visible_y = monitor.visible_y / scale;
    let visible_width = monitor.visible_width / scale;
    let visible_height = monitor.visible_height / scale;

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

    // Convert cursor from physical to logical coordinates
    let cursor_x = monitor.cursor_x / scale;
    let cursor_y = monitor.cursor_y / scale;

    cursor_x >= bounds_x
        && cursor_x <= bounds_x + bounds_width
        && cursor_y >= bounds_y
        && cursor_y <= bounds_y + bounds_height
}
