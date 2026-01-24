use tauri::{Manager, WebviewWindowBuilder};

pub const SIMPLE_OVERLAY_LABEL: &str = "simple-overlay";
pub const SIMPLE_OVERLAY_WIDTH: f64 = 400.0;
pub const SIMPLE_OVERLAY_HEIGHT: f64 = 200.0;

pub const PILL_OVERLAY_LABEL: &str = "pill-overlay";
pub const PILL_OVERLAY_WIDTH: f64 = 196.0;
pub const PILL_OVERLAY_HEIGHT: f64 = 128.0;

pub const UNIFIED_OVERLAY_LABEL: &str = "unified-overlay";

const BOTTOM_MARGIN: f64 = 52.0;
const CURSOR_POLL_INTERVAL_MS: u64 = 100;
const POSITION_THRESHOLD: f64 = 1.0;
const DEFAULT_SCREEN_WIDTH: f64 = 1920.0;
const DEFAULT_SCREEN_HEIGHT: f64 = 1080.0;

fn get_primary_screen_size(app: &tauri::AppHandle) -> (f64, f64) {
    if let Some(monitor) = app.primary_monitor().ok().flatten() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        (size.width as f64 / scale, size.height as f64 / scale)
    } else {
        (DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT)
    }
}

fn build_overlay_webview_url(
    app: &tauri::AppHandle,
    query_param: &str,
) -> tauri::Result<tauri::WebviewUrl> {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = app.config().build.dev_url.clone() {
            let query = match dev_url.query() {
                Some(existing) if !existing.is_empty() => format!("{existing}&{query_param}=1"),
                _ => format!("{query_param}=1"),
            };
            dev_url.set_query(Some(&query));
            return Ok(tauri::WebviewUrl::External(dev_url));
        }
    }

    Ok(tauri::WebviewUrl::App(
        format!("index.html?{query_param}=1").into(),
    ))
}

fn create_overlay_window(
    app: &tauri::AppHandle,
    label: &str,
    width: f64,
    height: f64,
    url: tauri::WebviewUrl,
) -> tauri::Result<()> {
    let (screen_width, screen_height) = get_primary_screen_size(app);

    let x = (screen_width - width) / 2.0;
    let y = screen_height * 0.75;

    let builder = {
        let builder = WebviewWindowBuilder::new(app, label, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(width, height)
            .position(x, y);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure {label} as non-activating: {err}");
    }

    Ok(())
}

#[allow(dead_code)]
pub fn ensure_unified_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(UNIFIED_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let (width, height) = get_primary_screen_size(app);

    let builder = {
        let url = build_overlay_webview_url(app, "overlay")?;
        let builder = WebviewWindowBuilder::new(app, UNIFIED_OVERLAY_LABEL, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(width, height)
            .position(0.0, 0.0);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure overlay as non-activating: {err}");
    }

    Ok(())
}

pub fn ensure_simple_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(SIMPLE_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let url = build_overlay_webview_url(app, "simple-overlay")?;
    create_overlay_window(
        app,
        SIMPLE_OVERLAY_LABEL,
        SIMPLE_OVERLAY_WIDTH,
        SIMPLE_OVERLAY_HEIGHT,
        url,
    )
}

pub fn ensure_pill_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(PILL_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let url = build_overlay_webview_url(app, "pill-overlay")?;
    create_overlay_window(
        app,
        PILL_OVERLAY_LABEL,
        PILL_OVERLAY_WIDTH,
        PILL_OVERLAY_HEIGHT,
        url,
    )
}

struct OverlayConfig {
    label: &'static str,
    width: f64,
    height: f64,
}

const TRACKED_OVERLAYS: &[OverlayConfig] = &[
    OverlayConfig {
        label: SIMPLE_OVERLAY_LABEL,
        width: SIMPLE_OVERLAY_WIDTH,
        height: SIMPLE_OVERLAY_HEIGHT,
    },
    OverlayConfig {
        label: PILL_OVERLAY_LABEL,
        width: PILL_OVERLAY_WIDTH,
        height: PILL_OVERLAY_HEIGHT,
    },
];

pub fn start_cursor_follower(app: tauri::AppHandle) {
    use std::time::Duration;

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(CURSOR_POLL_INTERVAL_MS));

            let Some(monitor) = crate::platform::monitor::get_monitor_at_cursor() else {
                continue;
            };

            #[cfg(target_os = "macos")]
            let (logical_visible_x, logical_visible_width, logical_height) = (
                monitor.visible_x,
                monitor.visible_width,
                monitor.height,
            );

            #[cfg(not(target_os = "macos"))]
            let (logical_visible_x, logical_visible_width, logical_height) = {
                let scale = monitor.scale_factor;
                (
                    monitor.visible_x / scale,
                    monitor.visible_width / scale,
                    monitor.height / scale,
                )
            };

            for config in TRACKED_OVERLAYS {
                let Some(window) = app.get_webview_window(config.label) else {
                    continue;
                };

                let target_x = logical_visible_x + (logical_visible_width - config.width) / 2.0;
                let target_y = logical_height - config.height - BOTTOM_MARGIN;

                let should_update = match window.outer_position() {
                    Ok(current_pos) => {
                        let current_x = current_pos.x as f64 / monitor.scale_factor;
                        let current_y = current_pos.y as f64 / monitor.scale_factor;
                        (target_x - current_x).abs() > POSITION_THRESHOLD
                            || (target_y - current_y).abs() > POSITION_THRESHOLD
                    }
                    Err(_) => true,
                };

                if should_update {
                    let _ = window.set_position(tauri::Position::Logical(
                        tauri::LogicalPosition::new(target_x, target_y),
                    ));
                }
            }
        }
    });
}
