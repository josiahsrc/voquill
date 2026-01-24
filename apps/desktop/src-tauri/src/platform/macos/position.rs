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
            // Center horizontally within visible area
            let x = monitor.visible_x + (monitor.visible_width - window_width) / 2.0;
            // Position at bottom of the full monitor height (overlays can overlap dock)
            let y = monitor.height - window_height - margin;
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
