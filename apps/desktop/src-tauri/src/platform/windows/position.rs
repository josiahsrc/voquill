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
    // Windows uses standard screen coordinates:
    // - Y=0 is at the top
    // - Y increases downward
    // - Window position is the top-left corner
    //
    // Monitor values are in physical pixels, convert to logical for calculation
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
    // Windows: work entirely in physical coordinates to match cursor position
    let scale = monitor.scale_factor;

    // Scale the logical dimensions to physical
    let physical_bounds_width = bounds_width * scale;
    let physical_bounds_height = bounds_height * scale;
    let physical_margin = margin * scale;

    // Calculate bounds position in physical coordinates (same logic as set_overlay_position)
    let (bounds_x, bounds_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = monitor.visible_x + (monitor.visible_width - physical_bounds_width) / 2.0;
            let y = monitor.visible_y + monitor.visible_height - physical_bounds_height - physical_margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = monitor.visible_x + monitor.visible_width - physical_bounds_width - physical_margin;
            let y = monitor.visible_y + physical_margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = monitor.visible_x + physical_margin;
            let y = monitor.visible_y + physical_margin;
            (x, y)
        }
    };

    // Cursor is already in physical coordinates
    let cursor_x = monitor.cursor_x;
    let cursor_y = monitor.cursor_y;

    cursor_x >= bounds_x
        && cursor_x <= bounds_x + physical_bounds_width
        && cursor_y >= bounds_y
        && cursor_y <= bounds_y + physical_bounds_height
}
