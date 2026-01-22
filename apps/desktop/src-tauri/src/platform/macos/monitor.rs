use crate::domain::MonitorAtCursor;
use cocoa::appkit::{CGFloat, NSEvent, NSScreen};
use cocoa::base::nil;
use cocoa::foundation::NSArray;
use objc::{msg_send, sel, sel_impl};

const DEFAULT_BOTTOM_OFFSET: f64 = 12.0;
const DOCK_PADDING: f64 = 8.0;

pub fn get_bottom_offset() -> f64 {
    unsafe {
        let screen = NSScreen::mainScreen(nil);
        if screen == nil {
            return DEFAULT_BOTTOM_OFFSET;
        }

        let frame = NSScreen::frame(screen);
        let visible = NSScreen::visibleFrame(screen);
        let bottom_inset = visible.origin.y - frame.origin.y;

        if bottom_inset > 1.0 {
            bottom_inset + DOCK_PADDING
        } else {
            DEFAULT_BOTTOM_OFFSET
        }
    }
}

pub fn get_monitor_at_cursor() -> Option<MonitorAtCursor> {
    unsafe {
        let mouse_loc = NSEvent::mouseLocation(nil);
        let screens = NSScreen::screens(nil);
        let count = NSArray::count(screens);

        for i in 0..count {
            let screen: cocoa::base::id = msg_send![screens, objectAtIndex: i];
            let frame = NSScreen::frame(screen);

            if mouse_loc.x >= frame.origin.x
                && mouse_loc.x < frame.origin.x + frame.size.width
                && mouse_loc.y >= frame.origin.y
                && mouse_loc.y < frame.origin.y + frame.size.height
            {
                let visible = NSScreen::visibleFrame(screen);
                let backing_scale: CGFloat = msg_send![screen, backingScaleFactor];
                return Some(MonitorAtCursor {
                    x: frame.origin.x,
                    y: frame.origin.y,
                    width: frame.size.width,
                    height: frame.size.height,
                    visible_x: visible.origin.x,
                    visible_y: visible.origin.y,
                    visible_width: visible.size.width,
                    visible_height: visible.size.height,
                    scale_factor: backing_scale,
                    cursor_x: mouse_loc.x,
                    cursor_y: mouse_loc.y,
                });
            }
        }
    }
    None
}
