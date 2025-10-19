#![allow(clippy::missing_safety_doc)]
#![allow(unexpected_cfgs)]

use std::cell::RefCell;
use std::ops::Deref;
use std::time::Duration;

use cocoa::appkit::{
    NSColor, NSMainMenuWindowLevel, NSPanel, NSScreen, NSTextField, NSViewWidthSizable, NSWindow,
    NSWindowCollectionBehavior, NSWindowStyleMask, NSBackingStoreType,
};
use cocoa::base::{id, nil, NO, YES};
use cocoa::foundation::{NSPoint, NSRect, NSSize, NSString};
use dispatch::Queue;
use objc::{class, msg_send, sel, sel_impl};
use objc::rc::StrongPtr;

const OVERLAY_WIDTH: f64 = 220.0;
const OVERLAY_HEIGHT: f64 = 36.0;
const MIN_VISIBLE_WIDTH: f64 = 6.0;
const ANIMATION_STEPS: usize = 8;
const ANIMATION_DURATION: f64 = 0.22;
const MAX_ALPHA: f64 = 0.96;

thread_local! {
    static OVERLAY_STATE: RefCell<Option<OverlayState>> = RefCell::new(None);
}

struct OverlayState {
    panel: StrongPtr,
    is_visible: bool,
    animation_id: u64,
}

impl OverlayState {
    fn new() -> Self {
        unsafe {
            let panel = create_overlay_panel();
            let panel_ptr: id = *panel.deref();
            apply_panel_progress(panel_ptr, 0.0);
            let _: () = msg_send![panel_ptr, setAlphaValue: 0.0];
            let _: () = msg_send![panel_ptr, orderOut: nil];
            OverlayState {
                panel,
                is_visible: false,
                animation_id: 0,
            }
        }
    }

    fn bump_animation(&mut self) -> u64 {
        self.animation_id = self.animation_id.wrapping_add(1);
        self.animation_id
    }
}

pub fn prepare_overlay(_app: &tauri::AppHandle) -> tauri::Result<()> {
    run_on_main(|| {
        OVERLAY_STATE.with(|cell| {
            let mut slot = cell.borrow_mut();
            let state = slot.get_or_insert_with(OverlayState::new);
            state.is_visible = false;
            state.bump_animation();
            let panel_ptr: id = *state.panel.deref();
            unsafe {
                apply_panel_progress(panel_ptr, 0.0);
                let _: () = msg_send![panel_ptr, setAlphaValue: 0.0];
                let _: () = msg_send![panel_ptr, orderOut: nil];
            }
        });
    });

    Ok(())
}

pub fn show_overlay() -> tauri::Result<()> {
    run_on_main(|| {
        let (panel_ptr, animation_id, already_visible) = OVERLAY_STATE.with(|cell| {
            let mut slot = cell.borrow_mut();
            let state = slot.get_or_insert_with(OverlayState::new);
            let panel_ptr: id = *state.panel.deref();
            let already_visible = state.is_visible;
            state.is_visible = true;
            let animation_id = state.bump_animation();
            (panel_ptr, animation_id, already_visible)
        });

        if already_visible {
            unsafe {
                apply_panel_progress(panel_ptr, 1.0);
                let _: () = msg_send![panel_ptr, setAlphaValue: MAX_ALPHA];
                let _: () = msg_send![panel_ptr, orderFrontRegardless];
            }
            return;
        }

        unsafe {
            apply_panel_progress(panel_ptr, 0.0);
            let _: () = msg_send![panel_ptr, setAlphaValue: 0.0];
            let _: () = msg_send![panel_ptr, orderFrontRegardless];
        }
        animate_panel(true, animation_id);
    });

    Ok(())
}

pub fn hide_overlay() -> tauri::Result<()> {
    run_on_main(|| {
        let animation = OVERLAY_STATE.with(|cell| {
            let mut slot = cell.borrow_mut();
            if let Some(state) = slot.as_mut() {
                if !state.is_visible {
                    return None;
                }
                state.is_visible = false;
                let animation_id = state.bump_animation();
                Some(animation_id)
            } else {
                None
            }
        });

        if let Some(animation_id) = animation {
            animate_panel(false, animation_id);
        }
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

    let content_view = panel.contentView();
    let _: () = msg_send![content_view, setWantsLayer: YES];
    let layer: id = msg_send![content_view, layer];
    let background: id =
        NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.04, 0.04, 0.06, 1.0);
    let cg_color: id = msg_send![background, CGColor];
    let _: () = msg_send![layer, setBackgroundColor: cg_color];
    let _: () = msg_send![layer, setCornerRadius: 14.0];
    let _: () = msg_send![layer, setMasksToBounds: YES];

    let label_height = 18.0;
    let label_rect = NSRect::new(
        NSPoint::new(0.0, (OVERLAY_HEIGHT - label_height) / 2.0),
        NSSize::new(OVERLAY_WIDTH, label_height),
    );
    let label: id = NSTextField::initWithFrame_(NSTextField::alloc(nil), label_rect);
    let label_text = NSString::alloc(nil).init_str("Voquill is listening");
    NSTextField::setStringValue_(label, label_text);
    let _: () = msg_send![label_text, release];
    NSTextField::setEditable_(label, NO);

    let _: () = msg_send![label, setBordered: NO];
    let _: () = msg_send![label, setBezeled: NO];
    let _: () = msg_send![label, setDrawsBackground: NO];
    let _: () = msg_send![label, setSelectable: NO];
    let _: () = msg_send![label, setAlignment: 2_i64]; // NSTextAlignmentCenter
    let _: () = msg_send![label, setAutoresizingMask: NSViewWidthSizable];

    let text_color: id =
        NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.92, 0.92, 0.96, 1.0);
    let _: () = msg_send![label, setTextColor: text_color];
    let font: id = msg_send![class!(NSFont), systemFontOfSize: 13.0];
    let _: () = msg_send![label, setFont: font];

    let _: () = msg_send![content_view, addSubview: label];

    StrongPtr::new(panel)
}

unsafe fn apply_panel_progress(panel: id, progress: f64) {
    let clamped = progress.clamp(0.0, 1.0);
    let width = (OVERLAY_WIDTH * clamped).max(MIN_VISIBLE_WIDTH);

    let screen = NSScreen::mainScreen(nil);
    if screen == nil {
        return;
    }
    let frame = NSScreen::frame(screen);
    let origin_x = frame.origin.x + (frame.size.width - width) / 2.0;
    let origin_y = frame.origin.y + frame.size.height - OVERLAY_HEIGHT + 2.0;
    let rect = NSRect::new(
        NSPoint::new(origin_x, origin_y),
        NSSize::new(width, OVERLAY_HEIGHT),
    );

    panel.setFrame_display_(rect, NO);
    panel.setAlphaValue_(clamped * MAX_ALPHA);
}

fn animate_panel(opening: bool, animation_id: u64) {
    for step in 0..=ANIMATION_STEPS {
        let normalized = step as f64 / ANIMATION_STEPS as f64;
        let eased = ease_out(normalized);
        let progress = if opening { eased } else { 1.0 - eased };
        let delay = Duration::from_secs_f64(normalized * ANIMATION_DURATION);
        Queue::main().exec_after(delay, move || {
            OVERLAY_STATE.with(|cell| {
                let mut slot = cell.borrow_mut();
                if let Some(state) = slot.as_mut() {
                    if state.animation_id != animation_id {
                        return;
                    }
                    unsafe {
                        let panel_ptr: id = *state.panel.deref();
                        apply_panel_progress(panel_ptr, progress);
                        if !opening && step == ANIMATION_STEPS {
                            let _: () = msg_send![panel_ptr, orderOut: nil];
                        }
                    }
                }
            });
        });
    }
}

fn ease_out(progress: f64) -> f64 {
    let clamped = progress.clamp(0.0, 1.0);
    1.0 - (1.0 - clamped).powi(3)
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
    unsafe { msg_send![class!(NSThread), isMainThread] }
}
