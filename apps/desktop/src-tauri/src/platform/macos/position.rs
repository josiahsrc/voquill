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
    // macOS uses Logical positions with Cocoa's coordinate system
    // monitor values are in logical (point) units
    //
    // Coordinate system notes:
    // - Tauri's LogicalPosition uses standard coordinates (Y=0 at top, Y increases down)
    // - monitor.height is the full screen height
    // - monitor.visible_x/visible_width account for dock on sides

    let (target_x, target_y) = match anchor {
        OverlayAnchor::BottomCenter => {
            let x = monitor.visible_x + (monitor.visible_width - window_width) / 2.0;
            let y = monitor.height - window_height - margin;
            (x, y)
        }
        OverlayAnchor::TopRight => {
            let x = monitor.visible_x + monitor.visible_width - window_width - margin;
            let y = margin;
            (x, y)
        }
        OverlayAnchor::TopLeft => {
            let x = monitor.visible_x + margin;
            let y = margin;
            (x, y)
        }
    };

    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
        target_x, target_y,
    )));
}
