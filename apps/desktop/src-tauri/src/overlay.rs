use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager, WebviewWindowBuilder};

pub const PILL_OVERLAY_LABEL: &str = "pill-overlay";
pub const PILL_OVERLAY_WIDTH: f64 = 256.0;
pub const PILL_OVERLAY_HEIGHT: f64 = 96.0;
pub const MIN_PILL_WIDTH: f64 = 48.0;
pub const MIN_PILL_HEIGHT: f64 = 6.0;
pub const MIN_PILL_HOVER_PADDING: f64 = 4.0;
pub const EXPANDED_PILL_WIDTH: f64 = 120.0;
pub const EXPANDED_PILL_HEIGHT: f64 = 32.0;
pub const EXPANDED_PILL_HOVERABLE_WIDTH: f64 = EXPANDED_PILL_WIDTH + 16.0;
pub const EXPANDED_PILL_HOVERABLE_HEIGHT: f64 = EXPANDED_PILL_HEIGHT + 16.0;

pub const UNIFIED_OVERLAY_LABEL: &str = "unified-overlay";

pub const TOAST_OVERLAY_LABEL: &str = "toast-overlay";
pub const TOAST_OVERLAY_WIDTH: f64 = 380.0;
pub const TOAST_OVERLAY_HEIGHT: f64 = 164.0;
pub const TOAST_OVERLAY_TOP_OFFSET: f64 = 0.0;
pub const TOAST_OVERLAY_RIGHT_OFFSET: f64 = 0.0;

pub const AGENT_OVERLAY_LABEL: &str = "agent-overlay";
pub const AGENT_OVERLAY_WIDTH: f64 = 332.0;
pub const AGENT_OVERLAY_HEIGHT: f64 = 632.0;
pub const AGENT_OVERLAY_LEFT_OFFSET: f64 = 16.0;
pub const AGENT_OVERLAY_TOP_OFFSET: f64 = 16.0;

const CURSOR_POLL_INTERVAL_MS: u64 = 60;
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
    )?;

    if let Some(window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
        let _ = window.set_ignore_cursor_events(true);
    }

    Ok(())
}

pub fn ensure_toast_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(TOAST_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let (screen_width, _screen_height) = get_primary_screen_size(app);

    let url = build_overlay_webview_url(app, "toast-overlay")?;

    let x = screen_width - TOAST_OVERLAY_WIDTH - TOAST_OVERLAY_RIGHT_OFFSET;
    let y = TOAST_OVERLAY_TOP_OFFSET;

    let builder = {
        let builder = WebviewWindowBuilder::new(app, TOAST_OVERLAY_LABEL, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(TOAST_OVERLAY_WIDTH, TOAST_OVERLAY_HEIGHT)
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
        eprintln!("Failed to configure {TOAST_OVERLAY_LABEL} as non-activating: {err}");
    }

    if let Some(window) = app.get_webview_window(TOAST_OVERLAY_LABEL) {
        let _ = window.set_ignore_cursor_events(true);
    }

    Ok(())
}

pub fn ensure_agent_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(AGENT_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let url = build_overlay_webview_url(app, "agent-overlay")?;

    let x = AGENT_OVERLAY_LEFT_OFFSET;
    let y = AGENT_OVERLAY_TOP_OFFSET;

    let builder = {
        let builder = WebviewWindowBuilder::new(app, AGENT_OVERLAY_LABEL, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(AGENT_OVERLAY_WIDTH, AGENT_OVERLAY_HEIGHT)
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
        eprintln!("Failed to configure {AGENT_OVERLAY_LABEL} as non-activating: {err}");
    }

    if let Some(window) = app.get_webview_window(AGENT_OVERLAY_LABEL) {
        let _ = window.set_ignore_cursor_events(true);
    }

    Ok(())
}

pub fn start_cursor_follower(app: tauri::AppHandle) {
    use std::time::Duration;
    use tauri::Manager;

    std::thread::spawn(move || {
        let pill_hovered = AtomicBool::new(false);
        let pill_expanded = AtomicBool::new(false);

        loop {
            std::thread::sleep(Duration::from_millis(CURSOR_POLL_INTERVAL_MS));

            let Some(monitor) = crate::platform::monitor::get_monitor_at_cursor() else {
                continue;
            };

            #[cfg(target_os = "macos")]
            let (visible_x, visible_y, visible_width, visible_height) = (
                monitor.visible_x,
                monitor.visible_y,
                monitor.visible_width,
                monitor.visible_height,
            );

            #[cfg(not(target_os = "macos"))]
            let (visible_x, visible_y, visible_width, visible_height) = {
                let scale = monitor.scale_factor;
                (
                    monitor.visible_x / scale,
                    monitor.visible_y / scale,
                    monitor.visible_width / scale,
                    monitor.visible_height / scale,
                )
            };

            let bottom_offset = crate::platform::monitor::get_bottom_pill_offset();

            if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
                let target_x = visible_x + (visible_width - PILL_OVERLAY_WIDTH) / 2.0;
                let target_y = visible_y + visible_height - PILL_OVERLAY_HEIGHT - bottom_offset;

                let physical_x = (target_x * monitor.scale_factor) as i32;
                let physical_y = (target_y * monitor.scale_factor) as i32;

                let _ = pill_window.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition::new(physical_x, physical_y),
                ));
            }

            if let Some(toast_window) = app.get_webview_window(TOAST_OVERLAY_LABEL) {
                let target_x =
                    visible_x + visible_width - TOAST_OVERLAY_WIDTH - TOAST_OVERLAY_RIGHT_OFFSET;
                let target_y = visible_y + TOAST_OVERLAY_TOP_OFFSET;

                let physical_x = (target_x * monitor.scale_factor) as i32;
                let physical_y = (target_y * monitor.scale_factor) as i32;

                let _ = toast_window.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition::new(physical_x, physical_y),
                ));
            }

            if let Some(agent_window) = app.get_webview_window(AGENT_OVERLAY_LABEL) {
                let target_x = visible_x + AGENT_OVERLAY_LEFT_OFFSET;
                let target_y = visible_y + AGENT_OVERLAY_TOP_OFFSET;

                let physical_x = (target_x * monitor.scale_factor) as i32;
                let physical_y = (target_y * monitor.scale_factor) as i32;

                let _ = agent_window.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition::new(physical_x, physical_y),
                ));
            }

            if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
                let pill_x = visible_x + (visible_width - EXPANDED_PILL_HOVERABLE_WIDTH) / 2.0;
                let pill_y =
                    visible_y + visible_height - EXPANDED_PILL_HOVERABLE_HEIGHT - bottom_offset;

                #[cfg(target_os = "macos")]
                let cursor_y_from_top = monitor.height - monitor.cursor_y;
                #[cfg(not(target_os = "macos"))]
                let cursor_y_from_top = monitor.cursor_y / monitor.scale_factor;

                #[cfg(target_os = "macos")]
                let cursor_x = monitor.cursor_x;
                #[cfg(not(target_os = "macos"))]
                let cursor_x = monitor.cursor_x / monitor.scale_factor;

                let in_full_pill = cursor_x >= pill_x
                    && cursor_x <= pill_x + EXPANDED_PILL_HOVERABLE_WIDTH
                    && cursor_y_from_top >= pill_y
                    && cursor_y_from_top <= pill_y + EXPANDED_PILL_HOVERABLE_HEIGHT;

                let hover_zone_width = MIN_PILL_WIDTH + MIN_PILL_HOVER_PADDING * 2.0;
                let hover_zone_height = MIN_PILL_HEIGHT + MIN_PILL_HOVER_PADDING * 2.0;
                let hover_zone_x =
                    pill_x + (EXPANDED_PILL_HOVERABLE_WIDTH - hover_zone_width) / 2.0;
                let hover_zone_y = pill_y + EXPANDED_PILL_HOVERABLE_HEIGHT - hover_zone_height
                    + MIN_PILL_HOVER_PADDING;

                let in_mini_pill = cursor_x >= hover_zone_x
                    && cursor_x <= hover_zone_x + hover_zone_width
                    && cursor_y_from_top >= hover_zone_y
                    && cursor_y_from_top <= hover_zone_y + hover_zone_height;

                let new_hovered = if in_mini_pill {
                    true
                } else if !in_full_pill {
                    false
                } else {
                    pill_hovered.load(Ordering::Relaxed)
                };

                let was_hovered = pill_hovered.load(Ordering::Relaxed);
                let hovered_changed = new_hovered != was_hovered;
                if hovered_changed {
                    pill_hovered.store(new_hovered, Ordering::Relaxed);
                }

                let overlay_state = app.state::<crate::state::OverlayState>();
                let is_active = !overlay_state.is_idle();
                let new_expanded = new_hovered || is_active;

                let was_expanded = pill_expanded.load(Ordering::Relaxed);
                let expanded_changed = new_expanded != was_expanded;
                if expanded_changed {
                    let _ = pill_window.set_ignore_cursor_events(!new_expanded);
                    pill_expanded.store(new_expanded, Ordering::Relaxed);
                }

                if hovered_changed || expanded_changed {
                    let payload = crate::domain::PillExpandedPayload {
                        expanded: new_expanded,
                        hovered: new_hovered,
                    };
                    let _ = app.emit(crate::domain::EVT_PILL_EXPANDED, payload);
                }
            }
        }
    });
}
