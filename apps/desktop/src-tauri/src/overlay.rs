use std::sync::{
    atomic::{AtomicBool, AtomicU8, Ordering},
    Mutex,
};
use tauri::{Emitter, Manager, WebviewWindowBuilder};

use crate::domain::PillWindowSize;

pub const PILL_OVERLAY_LABEL: &str = "pill-overlay";
pub const PILL_OVERLAY_WIDTH: f64 = 256.0;
pub const PILL_OVERLAY_HEIGHT: f64 = 96.0;
pub const MIN_PILL_WIDTH: f64 = 48.0;
pub const MIN_PILL_HEIGHT: f64 = 6.0;
pub const MIN_PILL_HOVER_PADDING: f64 = 4.0;
pub const EXPANDED_PILL_WIDTH: f64 = 120.0;
pub const EXPANDED_PILL_HEIGHT: f64 = 32.0;
pub const EXPANDED_PILL_HOVERABLE_WIDTH: f64 = EXPANDED_PILL_WIDTH + 24.0;
pub const EXPANDED_PILL_HOVERABLE_HEIGHT: f64 = EXPANDED_PILL_HEIGHT + 56.0;
pub const ASSISTANT_COMPACT_WIDTH: f64 = 452.0;
pub const ASSISTANT_COMPACT_HEIGHT: f64 = 138.0;
pub const ASSISTANT_EXPANDED_WIDTH: f64 = 600.0;
pub const ASSISTANT_EXPANDED_HEIGHT: f64 = 276.0;
pub const ASSISTANT_TYPING_WIDTH: f64 = 600.0;
pub const ASSISTANT_TYPING_HEIGHT: f64 = 360.0;

pub const TOAST_OVERLAY_LABEL: &str = "toast-overlay";
pub const TOAST_OVERLAY_WIDTH: f64 = 380.0;
pub const TOAST_OVERLAY_HEIGHT: f64 = 164.0;
pub const TOAST_OVERLAY_TOP_OFFSET: f64 = 0.0;
pub const TOAST_OVERLAY_RIGHT_OFFSET: f64 = 0.0;

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
    _app: &tauri::AppHandle,
    query_param: &str,
) -> tauri::Result<tauri::WebviewUrl> {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = _app.config().build.dev_url.clone() {
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
    focusable: bool,
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
            .focusable(focusable)
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
        log::error!("Failed to configure {label} as non-activating: {err}");
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
        false,
    )?;

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

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        log::error!("Failed to configure {TOAST_OVERLAY_LABEL} as non-activating: {err}");
    }

    Ok(())
}

struct PillAnimState {
    current_width: f64,
    current_height: f64,
    shrink_deadline: Option<std::time::Instant>,
    shrink_width: f64,
    shrink_height: f64,
}

struct CursorFollowerState {
    pill_hovered: AtomicBool,
    pill_expanded: AtomicBool,
    pill_window_size: AtomicU8,
    last_monitor: Mutex<Option<MonitorSnapshot>>,
    pill_anim: Mutex<PillAnimState>,
}

const PILL_SHRINK_DELAY_MS: u64 = 380;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct MonitorSnapshot {
    visible_x: i64,
    visible_y: i64,
    visible_width: i64,
    visible_height: i64,
    scale_factor: i64,
}

fn quantize_coordinate(value: f64) -> i64 {
    (value * 1000.0).round() as i64
}

impl MonitorSnapshot {
    fn from_monitor(monitor: &crate::domain::MonitorAtCursor) -> Self {
        Self {
            visible_x: quantize_coordinate(monitor.visible_x),
            visible_y: quantize_coordinate(monitor.visible_y),
            visible_width: quantize_coordinate(monitor.visible_width),
            visible_height: quantize_coordinate(monitor.visible_height),
            scale_factor: quantize_coordinate(monitor.scale_factor),
        }
    }
}

fn get_pill_window_size(size: PillWindowSize) -> (f64, f64) {
    match size {
        PillWindowSize::Dictation => (PILL_OVERLAY_WIDTH, PILL_OVERLAY_HEIGHT),
        PillWindowSize::AssistantCompact => (ASSISTANT_COMPACT_WIDTH, ASSISTANT_COMPACT_HEIGHT),
        PillWindowSize::AssistantExpanded => (ASSISTANT_EXPANDED_WIDTH, ASSISTANT_EXPANDED_HEIGHT),
        PillWindowSize::AssistantTyping => (ASSISTANT_TYPING_WIDTH, ASSISTANT_TYPING_HEIGHT),
    }
}

fn pill_window_size_to_u8(size: PillWindowSize) -> u8 {
    match size {
        PillWindowSize::Dictation => 0,
        PillWindowSize::AssistantCompact => 1,
        PillWindowSize::AssistantExpanded => 2,
        PillWindowSize::AssistantTyping => 3,
    }
}

fn update_cursor_follower(app: &tauri::AppHandle, state: &CursorFollowerState) {
    use crate::domain::OverlayAnchor;

    let Some(monitor) = crate::platform::monitor::get_monitor_at_cursor() else {
        return;
    };

    let bottom_offset = crate::platform::monitor::get_bottom_pill_offset();
    let overlay_state = app.state::<crate::state::OverlayState>();
    let window_size = overlay_state.get_pill_window_size();
    let is_assistant_mode = overlay_state.is_assistant_mode();
    let size_tag = pill_window_size_to_u8(window_size);
    let previous_size = state.pill_window_size.load(Ordering::Relaxed);
    let size_changed = previous_size != size_tag;
    if size_changed {
        state.pill_window_size.store(size_tag, Ordering::Relaxed);
    }

    let monitor_snapshot = MonitorSnapshot::from_monitor(&monitor);
    let monitor_changed = {
        let mut guard = match state.last_monitor.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let changed = guard.as_ref() != Some(&monitor_snapshot);
        if changed {
            *guard = Some(monitor_snapshot);
        }
        changed
    };

    let (target_w, target_h) = get_pill_window_size(window_size);
    let (needs_resize, pill_w, pill_h) = {
        let mut anim = state.pill_anim.lock().unwrap_or_else(|e| e.into_inner());
        let mut changed = false;

        if size_changed {
            let growing = target_w > anim.current_width || target_h > anim.current_height;
            let shrinking = target_w < anim.current_width || target_h < anim.current_height;
            if growing {
                anim.current_width = target_w;
                anim.current_height = target_h;
                anim.shrink_deadline = None;
                changed = true;
            } else if shrinking {
                anim.shrink_deadline = Some(
                    std::time::Instant::now()
                        + std::time::Duration::from_millis(PILL_SHRINK_DELAY_MS),
                );
                anim.shrink_width = target_w;
                anim.shrink_height = target_h;
            } else {
                anim.shrink_deadline = None;
            }
        }

        if let Some(deadline) = anim.shrink_deadline {
            if std::time::Instant::now() >= deadline {
                anim.current_width = anim.shrink_width;
                anim.current_height = anim.shrink_height;
                anim.shrink_deadline = None;
                changed = true;
            }
        }

        (changed, anim.current_width, anim.current_height)
    };

    if needs_resize || monitor_changed {
        if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
            if needs_resize {
                let _ = pill_window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                    pill_w, pill_h,
                )));
            }
            crate::platform::position::set_overlay_position(
                &pill_window,
                &monitor,
                OverlayAnchor::BottomCenter,
                pill_w,
                pill_h,
                bottom_offset,
            );
        }
    }

    if monitor_changed {
        if let Some(toast_window) = app.get_webview_window(TOAST_OVERLAY_LABEL) {
            crate::platform::position::set_overlay_position(
                &toast_window,
                &monitor,
                OverlayAnchor::TopRight,
                TOAST_OVERLAY_WIDTH,
                TOAST_OVERLAY_HEIGHT,
                TOAST_OVERLAY_RIGHT_OFFSET,
            );
        }
    }

    if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
        let hover_enabled = overlay_state.is_pill_hover_enabled();
        let was_expanded = state.pill_expanded.load(Ordering::Relaxed);

        let (hover_width, hover_height) = if was_expanded {
            (
                EXPANDED_PILL_HOVERABLE_WIDTH,
                EXPANDED_PILL_HOVERABLE_HEIGHT,
            )
        } else {
            (
                MIN_PILL_WIDTH + MIN_PILL_HOVER_PADDING * 2.0,
                MIN_PILL_HEIGHT + MIN_PILL_HOVER_PADDING * 2.0,
            )
        };

        let new_hovered = if hover_enabled {
            crate::platform::position::is_cursor_in_bounds(
                &monitor,
                OverlayAnchor::BottomCenter,
                hover_width,
                hover_height,
                bottom_offset,
            )
        } else {
            false
        };

        let was_hovered = state.pill_hovered.load(Ordering::Relaxed);
        let hovered_changed = new_hovered != was_hovered;
        if hovered_changed {
            state.pill_hovered.store(new_hovered, Ordering::Relaxed);
        }

        let is_active = !overlay_state.is_idle();
        let new_expanded = new_hovered || is_active || is_assistant_mode;

        let was_expanded = state.pill_expanded.load(Ordering::Relaxed);
        let expanded_changed = new_expanded != was_expanded;
        if expanded_changed {
            let _ = crate::platform::window::set_overlay_click_through(&pill_window, !new_expanded);
            state.pill_expanded.store(new_expanded, Ordering::Relaxed);
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

#[cfg(target_os = "linux")]
pub fn start_cursor_follower(app: tauri::AppHandle) {
    use gtk::glib::{self, ControlFlow};
    use std::sync::Arc;
    use std::time::Duration;

    let state = Arc::new(CursorFollowerState {
        pill_hovered: AtomicBool::new(false),
        pill_expanded: AtomicBool::new(false),
        pill_window_size: AtomicU8::new(0),
        last_monitor: Mutex::new(None),
        pill_anim: Mutex::new(PillAnimState {
            current_width: PILL_OVERLAY_WIDTH,
            current_height: PILL_OVERLAY_HEIGHT,
            shrink_deadline: None,
            shrink_width: 0.0,
            shrink_height: 0.0,
        }),
    });

    glib::timeout_add_local(Duration::from_millis(CURSOR_POLL_INTERVAL_MS), move || {
        update_cursor_follower(&app, &state);
        ControlFlow::Continue
    });
}

#[cfg(not(target_os = "linux"))]
pub fn start_cursor_follower(app: tauri::AppHandle) {
    use std::time::Duration;

    std::thread::spawn(move || {
        let state = CursorFollowerState {
            pill_hovered: AtomicBool::new(false),
            pill_expanded: AtomicBool::new(false),
            pill_window_size: AtomicU8::new(0),
            last_monitor: Mutex::new(None),
            pill_anim: Mutex::new(PillAnimState {
                current_width: PILL_OVERLAY_WIDTH,
                current_height: PILL_OVERLAY_HEIGHT,
                shrink_deadline: None,
                shrink_width: 0.0,
                shrink_height: 0.0,
            }),
        };

        loop {
            std::thread::sleep(Duration::from_millis(CURSOR_POLL_INTERVAL_MS));
            update_cursor_follower(&app, &state);
        }
    });
}
