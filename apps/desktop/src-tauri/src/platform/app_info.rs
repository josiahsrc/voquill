use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use std::ffi::CStr;
#[cfg(target_os = "macos")]
use std::os::raw::c_char;

use base64::{engine::general_purpose, Engine as _};
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

pub fn get_current_app_info() -> Result<CurrentAppInfo, AppInfoError> {
    let config = FocusTrackerConfig::new().with_icon_size(DEFAULT_ICON_SIZE);
    let icon_size = config.icon.get_size_or_default();
    let tracker = FocusTracker::with_config(config.clone());
    let stop_signal = AtomicBool::new(false);
    let mut captured: Option<FocusedWindow> = None;

    tracker
        .track_focus_with_stop(
            |window| {
                captured = Some(window);
                stop_signal.store(true, Ordering::Relaxed);
                Ok(())
            },
            &stop_signal,
        )
        .map_err(map_focus_error)?;

    let window = captured.ok_or(AppInfoError::NotAvailable)?;
    build_app_info(window, icon_size)
}

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

fn resolve_app_name(window: &FocusedWindow) -> String {
    platform_app_name(window)
        .or_else(|| extract_app_name_from_title(window))
        .or_else(|| window.process_name.clone())
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Unknown application".to_string())
}

#[cfg(target_os = "macos")]
fn platform_app_name(window: &FocusedWindow) -> Option<String> {
    let pid = window.process_id?;

    unsafe {
        let app: id = msg_send![class!(NSRunningApplication), runningApplicationWithProcessIdentifier: pid as i32];
        if app == nil {
            return None;
        }

        let name: id = msg_send![app, localizedName];
        nsstring_to_string(name)
    }
}

#[cfg(not(target_os = "macos"))]
fn platform_app_name(_window: &FocusedWindow) -> Option<String> {
    None
}

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
