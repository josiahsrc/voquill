#![allow(clippy::missing_safety_doc)]
#![allow(unexpected_cfgs)]

use std::cell::RefCell;

use cocoa::appkit::{
    NSColor, NSMainMenuWindowLevel, NSPanel, NSScreen, NSTextField, NSWindow,
    NSWindowCollectionBehavior, NSWindowStyleMask, NSBackingStoreType,
};
use cocoa::base::{id, nil, NO, YES};
use cocoa::foundation::{NSPoint, NSRect, NSSize, NSString};
use dispatch::Queue;
use objc::{class, msg_send, sel, sel_impl};
use objc::rc::StrongPtr;

const OVERLAY_WIDTH: f64 = 220.0;
const OVERLAY_HEIGHT: f64 = 36.0;

thread_local! {
    static OVERLAY_PANEL: RefCell<Option<StrongPtr>> = RefCell::new(None);
}

pub fn ensure_overlay_visible(_app: &tauri::AppHandle) -> tauri::Result<()> {
    run_on_main(|| unsafe {
        OVERLAY_PANEL.with(|cell| {
            let mut panel_slot = cell.borrow_mut();

            if panel_slot.is_none() {
                *panel_slot = Some(create_overlay_panel());
            }

            if let Some(panel) = panel_slot.as_ref() {
                let panel_ptr: id = **panel;
                // Ensure the panel is visible without stealing focus.
                let _: () = msg_send![panel_ptr, orderFrontRegardless];
            }
        });
    });

    Ok(())
}

unsafe fn create_overlay_panel() -> StrongPtr {
    let screen = NSScreen::mainScreen(nil);
    let frame = NSScreen::frame(screen);

    let origin_x = frame.origin.x + (frame.size.width - OVERLAY_WIDTH) / 2.0;
    let origin_y = frame.origin.y + frame.size.height - OVERLAY_HEIGHT + 2.0;

    let rect = NSRect::new(
        NSPoint::new(origin_x, origin_y),
        NSSize::new(OVERLAY_WIDTH, OVERLAY_HEIGHT),
    );

    let panel: id = NSPanel::alloc(nil).initWithContentRect_styleMask_backing_defer_(
        rect,
        NSWindowStyleMask::NSBorderlessWindowMask,
        NSBackingStoreType::NSBackingStoreBuffered,
        NO,
    );

    panel.setBackgroundColor_(NSColor::clearColor(nil));
    panel.setOpaque_(NO);
    panel.setHasShadow_(NO);
    panel.setIgnoresMouseEvents_(YES);
    panel.setHidesOnDeactivate_(NO);
    panel.setCanHide_(NO);
    panel.setMovable_(NO);
    panel.setLevel_(i64::from(NSMainMenuWindowLevel + 1));
    panel.setCollectionBehavior_(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );
    panel.setReleasedWhenClosed_(NO);
    panel.setAlphaValue_(0.96);

    let content_view = panel.contentView();
    let _: () = msg_send![content_view, setWantsLayer: YES];
    let layer: id = msg_send![content_view, layer];
    let background: id =
        NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.07, 0.07, 0.09, 0.96);
    let cg_color: id = msg_send![background, CGColor];
    let _: () = msg_send![layer, setBackgroundColor: cg_color];
    let _: () = msg_send![layer, setCornerRadius: 14.0];
    let _: () = msg_send![layer, setMasksToBounds: YES];

    let label_height = 18.0;
    let label_rect = NSRect::new(
        NSPoint::new(0.0, (OVERLAY_HEIGHT - label_height) / 2.0),
        NSSize::new(OVERLAY_WIDTH, label_height),
    );
    let label: id = NSTextField::alloc(nil).initWithFrame_(label_rect);
    let label_text = NSString::alloc(nil).init_str("Voquill is listening");
    NSTextField::setStringValue_(label, label_text);
    NSTextField::setEditable_(label, NO);

    let _: () = msg_send![label, setBordered: NO];
    let _: () = msg_send![label, setBezeled: NO];
    let _: () = msg_send![label, setDrawsBackground: NO];
    let _: () = msg_send![label, setSelectable: NO];
    let _: () = msg_send![label, setAlignment: 2_i64]; // NSTextAlignmentCenter

    let text_color: id =
        NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.92, 0.92, 0.96, 1.0);
    let _: () = msg_send![label, setTextColor: text_color];
    let font: id = msg_send![class!(NSFont), systemFontOfSize: 13.0];
    let _: () = msg_send![label, setFont: font];

    let _: () = msg_send![content_view, addSubview: label];

    // The StrongPtr retains the native panel so we can keep it around while the app runs.
    StrongPtr::new(panel)
}

fn run_on_main<F>(task: F)
where
    F: FnOnce() + Send + 'static,
{
    if is_main_thread() {
        task();
    } else {
        Queue::main().exec_sync(task);
    }
}

fn is_main_thread() -> bool {
    unsafe {
        let result: bool = msg_send![class!(NSThread), isMainThread];
        result
    }
}
