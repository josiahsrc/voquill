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
    // macOS monitor.rs already converts visible_y to standard coordinates:
    // visible_y = top inset (e.g., menu bar height)
    // visible_height = usable height
    //
    // For macOS, we use LogicalPosition with coordinates relative to the
    // monitor's frame, and Tauri handles the platform-specific conversion.

    let (target_x, target_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = monitor.visible_x + (monitor.visible_width - window_width) / 2.0;
            let bottom_of_visible = monitor.visible_y + monitor.visible_height;
            let y = bottom_of_visible - window_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            // Right edge of visible area minus window width and margin
            let x = monitor.visible_x + monitor.visible_width - window_width - margin;
            // Top of visible area (below menu bar) plus margin
            let y = monitor.visible_y + margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            // Left edge of visible area plus margin
            let x = monitor.visible_x + margin;
            // Top of visible area (below menu bar) plus margin
            let y = monitor.visible_y + margin;
            (x, y)
        }
    };

    // macOS uses LogicalPosition - Tauri handles the coordinate conversion
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
    let (bounds_x, bounds_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = monitor.visible_x + (monitor.visible_width - bounds_width) / 2.0;
            let bottom_of_visible = monitor.visible_y + monitor.visible_height;
            let y = bottom_of_visible - bounds_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = monitor.visible_x + monitor.visible_width - bounds_width - margin;
            let y = monitor.visible_y + margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = monitor.visible_x + margin;
            let y = monitor.visible_y + margin;
            (x, y)
        }
    };

    // macOS cursor coordinates are in Cocoa system (Y=0 at bottom)
    // Convert to standard coordinates (Y=0 at top) to match bounds position
    let cursor_x = monitor.cursor_x;
    let cursor_y = monitor.height - monitor.cursor_y;

    cursor_x >= bounds_x
        && cursor_x <= bounds_x + bounds_width
        && cursor_y >= bounds_y
        && cursor_y <= bounds_y + bounds_height
}
