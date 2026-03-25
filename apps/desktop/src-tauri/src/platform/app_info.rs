#[cfg(target_os = "macos")]
use cocoa::base::{id, nil, NO, YES};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSPoint, NSRect, NSSize, NSString};
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use std::ffi::CStr;
#[cfg(target_os = "macos")]
use std::os::raw::c_char;

#[cfg(not(target_os = "macos"))]
use std::sync::atomic::{AtomicBool, Ordering};

use base64::{engine::general_purpose, Engine as _};
#[cfg(not(target_os = "macos"))]
use ferrous_focus::{FocusTracker, FocusTrackerConfig, FocusedWindow};
use image::{
    codecs::png::PngEncoder, imageops::FilterType, ExtendedColorType, ImageBuffer, ImageEncoder,
    Rgba, RgbaImage,
};
use thiserror::Error;

const DEFAULT_ICON_SIZE: u32 = 128;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentAppInfo {
    pub app_name: String,
    pub icon_base64: String,
}

#[derive(Debug, Error)]
pub enum AppInfoError {
    #[error("Failed to observe focused window: {0}")]
    Focus(String),
    #[error("Focused window information unavailable")]
    NotAvailable,
    #[error("Unsupported on this platform or configuration")]
    Unsupported,
    #[error("Permission denied while reading focused window information")]
    PermissionDenied,
    #[error("Failed to encode application icon: {0}")]
    Encode(String),
}

// ── macOS: native Cocoa implementation ──────────────────────────────

#[cfg(target_os = "macos")]
pub fn get_current_app_info() -> Result<CurrentAppInfo, AppInfoError> {
    unsafe {
        let pool: id = msg_send![class!(NSAutoreleasePool), new];
        let result = macos_get_app_info();
        let _: () = msg_send![pool, drain];
        result
    }
}

#[cfg(target_os = "macos")]
unsafe fn macos_get_app_info() -> Result<CurrentAppInfo, AppInfoError> {
    let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
    let app: id = msg_send![workspace, frontmostApplication];
    if app == nil {
        return Err(AppInfoError::NotAvailable);
    }

    let name_ns: id = msg_send![app, localizedName];
    let app_name = nsstring_to_string(name_ns).unwrap_or_else(|| "Unknown application".to_string());

    let icon: id = msg_send![app, icon];
    let icon_base64 = if icon != nil {
        macos_render_icon_png(icon, DEFAULT_ICON_SIZE).unwrap_or_else(|_| fallback_icon_base64())
    } else {
        fallback_icon_base64()
    };

    Ok(CurrentAppInfo {
        app_name,
        icon_base64,
    })
}

#[cfg(target_os = "macos")]
unsafe fn macos_render_icon_png(icon: id, size: u32) -> Result<String, AppInfoError> {
    let size_f = size as f64;
    let ns_size = NSSize::new(size_f, size_f);
    let _: () = msg_send![icon, setSize: ns_size];

    let alloc: id = msg_send![class!(NSBitmapImageRep), alloc];
    let cs = NSString::alloc(nil).init_str("NSDeviceRGBColorSpace");
    let rep: id = msg_send![alloc,
        initWithBitmapDataPlanes: std::ptr::null_mut::<*mut u8>()
        pixelsWide: size as i64
        pixelsHigh: size as i64
        bitsPerSample: 8i64
        samplesPerPixel: 4i64
        hasAlpha: YES
        isPlanar: NO
        colorSpaceName: cs
        bytesPerRow: (size * 4) as i64
        bitsPerPixel: 32i64
    ];
    if rep == nil {
        return Err(AppInfoError::Encode("Failed to create bitmap rep".into()));
    }

    let _: () = msg_send![class!(NSGraphicsContext), saveGraphicsState];
    let ctx: id = msg_send![class!(NSGraphicsContext), graphicsContextWithBitmapImageRep: rep];
    if ctx == nil {
        let _: () = msg_send![rep, release];
        let _: () = msg_send![class!(NSGraphicsContext), restoreGraphicsState];
        return Err(AppInfoError::Encode(
            "Failed to create graphics context".into(),
        ));
    }
    let _: () = msg_send![class!(NSGraphicsContext), setCurrentContext: ctx];

    let rect = NSRect::new(NSPoint::new(0.0, 0.0), ns_size);
    let zero = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(0.0, 0.0));
    let _: () = msg_send![icon,
        drawInRect: rect
        fromRect: zero
        operation: 2u64
        fraction: 1.0f64
    ];

    let _: () = msg_send![class!(NSGraphicsContext), restoreGraphicsState];

    let props: id = msg_send![class!(NSDictionary), dictionary];
    let png_data: id = msg_send![rep, representationUsingType: 4u64 properties: props];
    let _: () = msg_send![rep, release];

    if png_data == nil {
        return Err(AppInfoError::Encode("Failed to encode PNG".into()));
    }

    let length: usize = msg_send![png_data, length];
    let bytes: *const u8 = msg_send![png_data, bytes];
    if bytes.is_null() || length == 0 {
        return Err(AppInfoError::Encode("PNG data is empty".into()));
    }

    Ok(general_purpose::STANDARD.encode(std::slice::from_raw_parts(bytes, length)))
}

#[cfg(target_os = "macos")]
unsafe fn nsstring_to_string(string: id) -> Option<String> {
    if string == nil {
        return None;
    }

    let utf8: *const c_char = msg_send![string, UTF8String];
    if utf8.is_null() {
        return None;
    }

    Some(CStr::from_ptr(utf8).to_string_lossy().into_owned())
}

// ── Non-macOS: ferrous-focus implementation ─────────────────────────

#[cfg(not(target_os = "macos"))]
pub fn get_current_app_info() -> Result<CurrentAppInfo, AppInfoError> {
    let config = FocusTrackerConfig::new().with_icon_size(DEFAULT_ICON_SIZE);
    let icon_size = config.icon.get_size_or_default();
    let tracker = FocusTracker::with_config(config.clone());
    let stop_signal = AtomicBool::new(false);
    let mut captured: Option<FocusedWindow> = None;

    let ferrous_result = tracker.track_focus_with_stop(
        |window| {
            captured = Some(window);
            stop_signal.store(true, Ordering::Relaxed);
            Ok(())
        },
        &stop_signal,
    );

    match ferrous_result {
        Ok(()) => {
            let window = captured.ok_or(AppInfoError::NotAvailable)?;
            build_app_info(window, icon_size)
        }
        Err(ref err) if is_unsupported_error(err) => {
            // ferrous-focus doesn't support this configuration.
            // On Wayland, try GNOME Shell Introspect D-Bus as a fallback.
            #[cfg(target_os = "linux")]
            if crate::platform::linux::detect::is_wayland() {
                if let Some(info) = try_gnome_introspect_focused_app() {
                    return Ok(info);
                }
                return Err(AppInfoError::Focus(
                    "Focused window detection is not available on this Wayland compositor. \
                     Please use the app name field to register apps manually."
                        .into(),
                ));
            }

            Err(AppInfoError::Unsupported)
        }
        Err(err) => Err(map_focus_error(err)),
    }
}

#[cfg(not(target_os = "macos"))]
fn is_unsupported_error(err: &ferrous_focus::FerrousFocusError) -> bool {
    matches!(err, ferrous_focus::FerrousFocusError::Unsupported)
}

#[cfg(target_os = "linux")]
fn try_gnome_introspect_focused_app() -> Option<CurrentAppInfo> {
    let output = std::process::Command::new("gdbus")
        .args([
            "call",
            "--session",
            "--dest",
            "org.gnome.Shell.Introspect",
            "--object-path",
            "/org/gnome/Shell/Introspect",
            "--method",
            "org.gnome.Shell.Introspect.GetWindows",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    parse_gnome_introspect_focused(&raw)
}

#[cfg(target_os = "linux")]
fn parse_gnome_introspect_focused(raw: &str) -> Option<CurrentAppInfo> {
    // Find the window entry with 'focus': <true>
    // The output looks like: {..., 'title': <'Firefox'>, 'app-id': <'firefox.desktop'>, ..., 'focus': <true>, ...}
    let focus_idx = raw.find("'focus': <true>")?;

    // Walk backwards from the focus marker to find the enclosing window block's opening '{'
    let block_start = raw[..focus_idx].rfind('{')?;
    let block_end = raw[focus_idx..].find('}').map(|i| focus_idx + i)?;
    let block = &raw[block_start..=block_end];

    let app_name = extract_dbus_string_value(block, "'title': <'")
        .or_else(|| extract_dbus_string_value(block, "'app-id': <'"))
        .map(|s| {
            // Strip .desktop suffix from app-id
            s.strip_suffix(".desktop").unwrap_or(&s).to_string()
        })?;

    let icon_base64 = match encode_icon_as_png(&fallback_icon(DEFAULT_ICON_SIZE)) {
        Ok(png) => general_purpose::STANDARD.encode(png),
        Err(_) => String::new(),
    };

    Some(CurrentAppInfo {
        app_name,
        icon_base64,
    })
}

#[cfg(target_os = "linux")]
fn extract_dbus_string_value(block: &str, prefix: &str) -> Option<String> {
    let start = block.find(prefix)? + prefix.len();
    let rest = &block[start..];
    let end = rest.find('\'')?;
    let value = rest[..end].trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

#[cfg(not(target_os = "macos"))]
fn map_focus_error(err: ferrous_focus::FerrousFocusError) -> AppInfoError {
    use ferrous_focus::FerrousFocusError::*;
    match err {
        Unsupported => AppInfoError::Unsupported,
        PermissionDenied => AppInfoError::PermissionDenied,
        NotInteractiveSession => {
            AppInfoError::Focus("not running in an interactive session".into())
        }
        NoDisplay => AppInfoError::Focus("no display available".into()),
        Platform(message) | Error(message) | StdSyncPoisonError(message) => {
            AppInfoError::Focus(message)
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn build_app_info(window: FocusedWindow, icon_size: u32) -> Result<CurrentAppInfo, AppInfoError> {
    let mut window = window;
    let app_name = resolve_app_name(&window);

    let icon = window
        .icon
        .take()
        .unwrap_or_else(|| fallback_icon(icon_size));
    let encoded_icon = encode_icon_as_png(&icon)?;

    Ok(CurrentAppInfo {
        app_name,
        icon_base64: general_purpose::STANDARD.encode(encoded_icon),
    })
}

#[cfg(not(target_os = "macos"))]
fn resolve_app_name(window: &FocusedWindow) -> String {
    extract_app_name_from_title(window)
        .or_else(|| window.process_name.clone())
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Unknown application".to_string())
}

#[cfg(not(target_os = "macos"))]
fn extract_app_name_from_title(window: &FocusedWindow) -> Option<String> {
    let title = window.window_title.as_deref()?.trim();
    if title.is_empty() {
        return None;
    }

    for separator in [" — ", " – ", " - "] {
        if let Some((_, candidate)) = title.rsplit_once(separator) {
            let candidate = candidate.trim();
            if !candidate.is_empty() {
                return Some(candidate.to_string());
            }
        }
    }

    None
}

// ── Shared utilities ────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn fallback_icon_base64() -> String {
    let fallback = fallback_icon(DEFAULT_ICON_SIZE);
    match encode_icon_as_png(&fallback) {
        Ok(png) => general_purpose::STANDARD.encode(png),
        Err(_) => String::new(),
    }
}

fn fallback_icon(size: u32) -> RgbaImage {
    let size = size.max(1);
    let gradient_start = Rgba([96, 110, 140, 255]);
    let gradient_end = Rgba([62, 72, 94, 255]);

    let mut image = ImageBuffer::from_pixel(size, size, gradient_end);

    if size > 1 {
        for y in 0..size {
            let t = y as f32 / (size - 1) as f32;
            let color = blend_rgba(gradient_start, gradient_end, t);
            for x in 0..size {
                image.put_pixel(x, y, color);
            }
        }
    }

    image
}

fn blend_rgba(a: Rgba<u8>, b: Rgba<u8>, t: f32) -> Rgba<u8> {
    let clamp = |value: f32| -> u8 { value.clamp(0.0, 255.0) as u8 };
    let inv_t = 1.0 - t;
    let r = clamp(a[0] as f32 * inv_t + b[0] as f32 * t);
    let g = clamp(a[1] as f32 * inv_t + b[1] as f32 * t);
    let b_channel = clamp(a[2] as f32 * inv_t + b[2] as f32 * t);
    let a_channel = clamp(a[3] as f32 * inv_t + b[3] as f32 * t);

    Rgba([r, g, b_channel, a_channel])
}

fn encode_icon_as_png(icon: &RgbaImage) -> Result<Vec<u8>, AppInfoError> {
    let resized = resize_icon_if_needed(icon);
    let mut buffer = Vec::new();
    let encoder = PngEncoder::new(&mut buffer);
    encoder
        .write_image(
            resized.as_raw(),
            resized.width(),
            resized.height(),
            ExtendedColorType::Rgba8,
        )
        .map_err(|err| AppInfoError::Encode(err.to_string()))?;

    Ok(buffer)
}

fn resize_icon_if_needed(icon: &RgbaImage) -> RgbaImage {
    if icon.width() == DEFAULT_ICON_SIZE && icon.height() == DEFAULT_ICON_SIZE {
        return icon.clone();
    }

    image::imageops::resize(
        icon,
        DEFAULT_ICON_SIZE,
        DEFAULT_ICON_SIZE,
        FilterType::Lanczos3,
    )
}
