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
    // GDK returns coordinates in logical (application) pixels already,
    // so we use them directly without dividing by scale
    let scale = monitor.scale_factor;

    let visible_x = monitor.visible_x;
    let visible_y = monitor.visible_y;
    let visible_width = monitor.visible_width;
    let visible_height = monitor.visible_height;

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
