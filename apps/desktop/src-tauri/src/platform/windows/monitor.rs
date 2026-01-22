use crate::domain::MonitorAtCursor;
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

const DEFAULT_BOTTOM_OFFSET: f64 = 48.0;
const TASKBAR_PADDING: f64 = 8.0;

pub fn get_bottom_offset() -> f64 {
    unsafe {
        let mut cursor_pos = POINT::default();
        if GetCursorPos(&mut cursor_pos).is_err() {
            return DEFAULT_BOTTOM_OFFSET;
        }

        let monitor = MonitorFromPoint(cursor_pos, MONITOR_DEFAULTTONEAREST);
        if monitor.is_invalid() {
            return DEFAULT_BOTTOM_OFFSET;
        }

        let mut monitor_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if !GetMonitorInfoW(monitor, &mut monitor_info).as_bool() {
            return DEFAULT_BOTTOM_OFFSET;
        }

        let frame = monitor_info.rcMonitor;
        let work_area = monitor_info.rcWork;
        let bottom_inset = (frame.bottom - work_area.bottom) as f64;

        if bottom_inset > 1.0 {
            bottom_inset + TASKBAR_PADDING
        } else {
            DEFAULT_BOTTOM_OFFSET
        }
    }
}

pub fn get_monitor_at_cursor() -> Option<MonitorAtCursor> {
    unsafe {
        let mut cursor_pos = POINT::default();
        if GetCursorPos(&mut cursor_pos).is_err() {
            return None;
        }

        let monitor = MonitorFromPoint(cursor_pos, MONITOR_DEFAULTTONEAREST);
        if monitor.is_invalid() {
            return None;
        }

        let mut monitor_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if !GetMonitorInfoW(monitor, &mut monitor_info).as_bool() {
            return None;
        }

        let frame = monitor_info.rcMonitor;
        let work_area = monitor_info.rcWork;

        let mut dpi_x: u32 = 96;
        let mut dpi_y: u32 = 96;
        let _ = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
        let scale_factor = dpi_x as f64 / 96.0;

        Some(MonitorAtCursor {
            x: frame.left as f64,
            y: frame.top as f64,
            width: (frame.right - frame.left) as f64,
            height: (frame.bottom - frame.top) as f64,
            visible_x: work_area.left as f64,
            visible_y: work_area.top as f64,
            visible_width: (work_area.right - work_area.left) as f64,
            visible_height: (work_area.bottom - work_area.top) as f64,
            scale_factor,
            cursor_x: cursor_pos.x as f64,
            cursor_y: cursor_pos.y as f64,
        })
    }
}
