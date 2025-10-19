#![allow(clippy::missing_safety_doc)]
#![allow(unexpected_cfgs)]

use std::cell::RefCell;
use std::f64::consts::TAU;
use std::ops::Deref;
use std::ptr;
use std::time::Duration;

use cocoa::appkit::{
    NSColor, NSImageView, NSMainMenuWindowLevel, NSPanel, NSScreen, NSTextField, NSView,
    NSViewWidthSizable, NSWindow, NSWindowCollectionBehavior, NSWindowStyleMask, NSBackingStoreType,
};
use cocoa::base::{id, nil, NO, YES};
use cocoa::foundation::{NSArray, NSPoint, NSRect, NSSize, NSString};
use core_graphics::geometry::CGAffineTransform;
use core_foundation::base::CFRelease;
use dispatch::Queue;
use objc::{class, msg_send, sel, sel_impl};
use objc::rc::StrongPtr;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPathCreateMutable() -> core_graphics::sys::CGPathRef;
    fn CGPathMoveToPoint(
        path: core_graphics::sys::CGPathRef,
        transform: *const CGAffineTransform,
        x: f64,
        y: f64,
    );
    fn CGPathAddLineToPoint(
        path: core_graphics::sys::CGPathRef,
        transform: *const CGAffineTransform,
        x: f64,
        y: f64,
    );
    fn CGPathAddCurveToPoint(
        path: core_graphics::sys::CGPathRef,
        transform: *const CGAffineTransform,
        cp1x: f64,
        cp1y: f64,
        cp2x: f64,
        cp2y: f64,
        x: f64,
        y: f64,
    );
    fn CGPathCloseSubpath(path: core_graphics::sys::CGPathRef);
}

const OVERLAY_WIDTH: f64 = 220.0;
const OVERLAY_HEIGHT: f64 = 32.0;
const MIN_VISIBLE_WIDTH: f64 = 6.0;
const ANIMATION_STEPS: usize = 8;
const ANIMATION_DURATION: f64 = 0.22;
const MAX_ALPHA: f64 = 0.96;

const LABEL_TOP_MARGIN: f64 = 5.0;
const LABEL_HEIGHT: f64 = 12.0;

const WAVE_COUNT: usize = 3;
const WAVE_RIGHT_PADDING: f64 = 12.0;
const WAVE_VERTICAL_PADDING: f64 = 4.0;
const WAVE_BASE_PHASE_STEP: f64 = 0.11;
const WAVE_PHASE_GAIN: f64 = 0.32;
const WAVE_CONTAINER_WIDTH: f64 = 33.6;
const WAVE_FREQUENCIES: [f64; WAVE_COUNT] = [0.8, 1.0, 1.25];
const WAVE_AMPLITUDE_MULTIPLIERS: [f64; WAVE_COUNT] = [1.6, 1.35, 1.05];
const WAVE_PHASE_OFFSETS: [f64; WAVE_COUNT] = [0.0, 0.85, 1.7];
const WAVE_OPACITIES: [f64; WAVE_COUNT] = [1.0, 0.78, 0.56];

const TARGET_DECAY_PER_FRAME: f64 = 0.985;
const LEVEL_SMOOTHING: f64 = 0.18;

const ICON_SIZE: f64 = 20.0;
const ICON_LEFT_PADDING: f64 = 8.0;

thread_local! {
    static OVERLAY_STATE: RefCell<Option<OverlayState>> = RefCell::new(None);
}

struct OverlayState {
    panel: StrongPtr,
    icon_view: StrongPtr,
    label: StrongPtr,
    waves_container: StrongPtr,
    wave_layers: Vec<StrongPtr>,
    gradient_left: StrongPtr,
    gradient_right: StrongPtr,
    background_layer: StrongPtr,
    current_level: f64,
    target_level: f64,
    phase: f64,
    is_visible: bool,
    animation_id: u64,
    wave_motion_id: u64,
}

impl OverlayState {
    fn new() -> Self {
        unsafe {
            let panel = create_overlay_panel();
            let panel_ptr = *panel.deref();
            let (
                background_layer,
                icon_view,
                label,
                waves_container,
                wave_layers,
                gradient_left,
                gradient_right,
            ) = configure_overlay_contents(panel_ptr);

            let state = OverlayState {
                panel,
                icon_view,
                label,
                waves_container,
                wave_layers,
                gradient_left,
                gradient_right,
                background_layer,
                current_level: 0.0,
                target_level: 0.0,
                phase: 0.0,
                is_visible: false,
                animation_id: 0,
                wave_motion_id: 0,
            };

            apply_overlay_progress(&state, 0.0);
            let _: () = msg_send![panel_ptr, setAlphaValue: 0.0];
            let _: () = msg_send![panel_ptr, orderOut: nil];

            state
        }
    }

    fn next_animation(&mut self) -> u64 {
        self.animation_id = self.animation_id.wrapping_add(1);
        self.animation_id
    }

    fn next_wave_motion(&mut self) -> u64 {
        self.wave_motion_id = self.wave_motion_id.wrapping_add(1);
        self.wave_motion_id
    }

    fn panel(&self) -> id {
        *self.panel.deref()
    }

    fn label(&self) -> id {
        *self.label.deref()
    }

    fn icon_view(&self) -> id {
        *self.icon_view.deref()
    }

    fn waves_container(&self) -> id {
        *self.waves_container.deref()
    }

    fn background_layer(&self) -> id {
        *self.background_layer.deref()
    }

    fn wave_layer(&self, index: usize) -> Option<id> {
        self.wave_layers.get(index).map(|layer| *layer.deref())
    }

    fn gradient_left(&self) -> id {
        *self.gradient_left.deref()
    }

    fn gradient_right(&self) -> id {
        *self.gradient_right.deref()
    }
}

pub fn prepare_overlay(_app: &tauri::AppHandle) -> tauri::Result<()> {
    run_on_main(|| {
        OVERLAY_STATE.with(|cell| {
            let mut entry = cell.borrow_mut();
            let state = entry.get_or_insert_with(OverlayState::new);
            state.is_visible = false;
            state.current_level = 0.0;
            state.target_level = 0.0;
            state.phase = 0.0;
            state.next_wave_motion();
            unsafe { update_active_app_icon(state); }
            let panel = state.panel();
            unsafe {
                apply_overlay_progress(state, 0.0);
                let _: () = msg_send![panel, setAlphaValue: 0.0];
                let _: () = msg_send![panel, orderOut: nil];
            }
        });
    });

    Ok(())
}

pub fn show_overlay() -> tauri::Result<()> {
    run_on_main(|| {
        let (panel, already_visible, animation_id, motion_id) = OVERLAY_STATE.with(|cell| {
            let mut entry = cell.borrow_mut();
            let state = entry.get_or_insert_with(OverlayState::new);
            let panel = state.panel();
            let already_visible = state.is_visible;
            state.is_visible = true;
            state.target_level = state.target_level.max(0.05);
            let animation_id = state.next_animation();
            let motion_id = state.next_wave_motion();
            unsafe { update_active_app_icon(state); }
            (panel, already_visible, animation_id, motion_id)
        });

        if already_visible {
            OVERLAY_STATE.with(|cell| {
                if let Some(state) = cell.borrow().as_ref() {
                    unsafe { apply_overlay_progress(state, 1.0); }
                }
            });
            unsafe {
                let _: () = msg_send![panel, setAlphaValue: MAX_ALPHA];
                let _: () = msg_send![panel, orderFrontRegardless];
            }
        } else {
            OVERLAY_STATE.with(|cell| {
                if let Some(state) = cell.borrow().as_ref() {
                    unsafe { apply_overlay_progress(state, 0.0); }
                }
            });
            unsafe {
                let _: () = msg_send![panel, setAlphaValue: 0.0];
                let _: () = msg_send![panel, orderFrontRegardless];
            }
            animate_panel(true, animation_id);
        }

        OVERLAY_STATE.with(|cell| {
            if let Some(state) = cell.borrow().as_ref() {
                unsafe { update_wave_paths(state); }
            }
        });

        schedule_wave_frame(motion_id);
    });

    Ok(())
}

pub fn hide_overlay() -> tauri::Result<()> {
    run_on_main(|| {
        OVERLAY_STATE.with(|cell| {
            let mut entry = cell.borrow_mut();
            if let Some(state) = entry.as_mut() {
                if !state.is_visible {
                    return;
                }

                state.is_visible = false;
                state.target_level = 0.0;
                state.current_level *= 0.3;
                let animation_id = state.next_animation();
                let _ = state.next_wave_motion();
                animate_panel(false, animation_id);
            }
        });
    });

    Ok(())
}

pub fn register_amplitude(amplitude: f64) {
    let clamped = amplitude.clamp(0.0, 1.0);
    enqueue_on_main(move || {
        OVERLAY_STATE.with(|cell| {
            let mut entry = cell.borrow_mut();
            if let Some(state) = entry.as_mut() {
                let boosted = (clamped.powf(0.5) * 1.35).min(1.0);
                state.target_level = (state.target_level * 0.25 + boosted * 0.75).min(1.0);
            }
        });
    });
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

    StrongPtr::new(panel)
}

unsafe fn configure_overlay_contents(
    panel: id,
) -> (
    StrongPtr, // background
    StrongPtr, // icon view
    StrongPtr, // label
    StrongPtr, // waves container
    Vec<StrongPtr>,
    StrongPtr, // left gradient
    StrongPtr, // right gradient
) {
    let content_view = panel.contentView();
    let _: () = msg_send![content_view, setWantsLayer: YES];
    let root_layer: id = msg_send![content_view, layer];

    let background_layer: id = msg_send![class!(CAShapeLayer), layer];
    let fill_color: id = NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.0, 0.0, 0.0, 1.0);
    let cg_fill: id = msg_send![fill_color, CGColor];
    let _: () = msg_send![background_layer, setFillColor: cg_fill];
    let _: () = msg_send![background_layer, setMasksToBounds: NO];
    let _: () = msg_send![background_layer, setAnchorPoint: NSPoint::new(0.0, 0.0)];
    let _: () = msg_send![root_layer, insertSublayer: background_layer atIndex:0u32];

    let icon_y = (OVERLAY_HEIGHT - ICON_SIZE).max(0.0) / 2.0;
    let icon_rect = NSRect::new(
        NSPoint::new(ICON_LEFT_PADDING, icon_y),
        NSSize::new(ICON_SIZE, ICON_SIZE),
    );
    let icon_view: id = NSImageView::initWithFrame_(NSImageView::alloc(nil), icon_rect);
    let _: () = msg_send![icon_view, setImageScaling: 2u64]; // NSImageScaleProportionallyUpOrDown
    let _: () = msg_send![icon_view, setWantsLayer: YES];
    let icon_layer: id = msg_send![icon_view, layer];
    let _: () = msg_send![icon_layer, setCornerRadius: 4.0];
    let _: () = msg_send![icon_layer, setMasksToBounds: YES];
    let _: () = msg_send![content_view, addSubview: icon_view];

    let label_rect = NSRect::new(
        NSPoint::new(0.0, OVERLAY_HEIGHT - LABEL_HEIGHT - LABEL_TOP_MARGIN),
        NSSize::new(OVERLAY_WIDTH, LABEL_HEIGHT),
    );
    let label: id = NSTextField::initWithFrame_(NSTextField::alloc(nil), label_rect);
    let label_text = NSString::alloc(nil).init_str("");
    NSTextField::setStringValue_(label, label_text);
    let _: () = msg_send![label_text, release];
    NSTextField::setEditable_(label, NO);

    let _: () = msg_send![label, setBordered: NO];
    let _: () = msg_send![label, setBezeled: NO];
    let _: () = msg_send![label, setDrawsBackground: NO];
    let _: () = msg_send![label, setSelectable: NO];
    let _: () = msg_send![label, setAlignment: 2_i64];
    let _: () = msg_send![label, setAutoresizingMask: NSViewWidthSizable];

    let text_color: id =
        NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.92, 0.92, 0.96, 1.0);
    let _: () = msg_send![label, setTextColor: text_color];
    let font: id = msg_send![class!(NSFont), systemFontOfSize: 12.0];
    let _: () = msg_send![label, setFont: font];
    let _: () = msg_send![content_view, addSubview: label];
    let _: () = msg_send![label, setHidden: YES];

    let waves_height =
        (OVERLAY_HEIGHT - LABEL_HEIGHT - LABEL_TOP_MARGIN - WAVE_VERTICAL_PADDING * 2.0).max(10.0);
    let initial_width = wave_container_width(OVERLAY_WIDTH);
    let waves_rect = NSRect::new(
        NSPoint::new(OVERLAY_WIDTH - initial_width - WAVE_RIGHT_PADDING, WAVE_VERTICAL_PADDING),
        NSSize::new(initial_width, waves_height),
    );
    let waves_container: id = NSView::initWithFrame_(NSView::alloc(nil), waves_rect);
    let _: () = msg_send![waves_container, setWantsLayer: YES];
    let container_layer: id = msg_send![waves_container, layer];
    let clear_color: id = NSColor::clearColor(nil);
    let clear_ref: id = msg_send![clear_color, CGColor];
    let _: () = msg_send![container_layer, setBackgroundColor: clear_ref];
    let _: () = msg_send![content_view, addSubview: waves_container];

    let mut wave_layers = Vec::with_capacity(WAVE_COUNT);
    for index in 0..WAVE_COUNT {
        let wave_layer: id = msg_send![class!(CAShapeLayer), layer];
        let stroke_color: id =
            NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 1.0, 1.0, 1.0, WAVE_OPACITIES[index]);
        let cg_stroke: id = msg_send![stroke_color, CGColor];
        let _: () = msg_send![wave_layer, setStrokeColor: cg_stroke];
        let _: () = msg_send![wave_layer, setFillColor: clear_ref];
        let _: () = msg_send![wave_layer, setLineWidth: 1.6];
        let line_cap = NSString::alloc(nil).init_str("round");
        let _: () = msg_send![wave_layer, setLineCap: line_cap];
        let _: () = msg_send![line_cap, release];
        let line_join = NSString::alloc(nil).init_str("round");
        let _: () = msg_send![wave_layer, setLineJoin: line_join];
        let _: () = msg_send![line_join, release];
        let _: () = msg_send![container_layer, addSublayer: wave_layer];
        wave_layers.push(StrongPtr::retain(wave_layer));
    }

    // Gradient overlays
    let gradient_left: id = msg_send![class!(CAGradientLayer), layer];
    let gradient_right: id = msg_send![class!(CAGradientLayer), layer];

    let black_color: id = NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.0, 0.0, 0.0, 1.0);
    let black_cg: id = msg_send![black_color, CGColor];
    let transparent_color: id = NSColor::colorWithSRGBRed_green_blue_alpha_(nil, 0.0, 0.0, 0.0, 0.0);
    let transparent_cg: id = msg_send![transparent_color, CGColor];

    // Left gradient colors and locations
    let left_colors: id = NSArray::arrayWithObjects(nil, &[black_cg, transparent_cg, transparent_cg]);
    let loc0: id = msg_send![class!(NSNumber), numberWithDouble: 0.0];
    let loc1: id = msg_send![class!(NSNumber), numberWithDouble: 0.25];
    let loc2: id = msg_send![class!(NSNumber), numberWithDouble: 1.0];
    let left_locations: id = NSArray::arrayWithObjects(nil, &[loc0, loc1, loc2]);
    let _: () = msg_send![gradient_left, setColors: left_colors];
    let _: () = msg_send![gradient_left, setLocations: left_locations];
    let _: () = msg_send![gradient_left, setStartPoint: NSPoint::new(0.0, 0.5)];
    let _: () = msg_send![gradient_left, setEndPoint: NSPoint::new(1.0, 0.5)];
    let _: () = msg_send![gradient_left, setZPosition: 5.0];

    // Right gradient colors and locations
    let right_colors: id = NSArray::arrayWithObjects(nil, &[transparent_cg, transparent_cg, black_cg]);
    let rloc0: id = msg_send![class!(NSNumber), numberWithDouble: 0.0];
    let rloc1: id = msg_send![class!(NSNumber), numberWithDouble: 0.75];
    let rloc2: id = msg_send![class!(NSNumber), numberWithDouble: 1.0];
    let right_locations: id = NSArray::arrayWithObjects(nil, &[rloc0, rloc1, rloc2]);
    let _: () = msg_send![gradient_right, setColors: right_colors];
    let _: () = msg_send![gradient_right, setLocations: right_locations];
    let _: () = msg_send![gradient_right, setStartPoint: NSPoint::new(0.0, 0.5)];
    let _: () = msg_send![gradient_right, setEndPoint: NSPoint::new(1.0, 0.5)];
    let _: () = msg_send![gradient_right, setZPosition: 5.0];

    let _: () = msg_send![container_layer, addSublayer: gradient_left];
    let _: () = msg_send![container_layer, addSublayer: gradient_right];

    (
        StrongPtr::retain(background_layer),
        StrongPtr::new(icon_view),
        StrongPtr::new(label),
        StrongPtr::new(waves_container),
        wave_layers,
        StrongPtr::retain(gradient_left),
        StrongPtr::retain(gradient_right),
    )
}

unsafe fn apply_overlay_progress(state: &OverlayState, progress: f64) {
    let panel = state.panel();
    let width = (OVERLAY_WIDTH * progress).max(MIN_VISIBLE_WIDTH);

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
    panel.setAlphaValue_((progress.clamp(0.0, 1.0) * MAX_ALPHA) as f64);
    layout_overlay_contents(state, width);
}

unsafe fn layout_overlay_contents(state: &OverlayState, width: f64) {
    update_background_path(state, width);
    position_icon(state, width);
    position_label(state, width);
    position_waves_container(state, width);
    update_gradient_layers(state);
    update_wave_paths(state);
}

fn wave_container_width(width: f64) -> f64 {
    if width <= WAVE_RIGHT_PADDING {
        return width.max(0.0);
    }
    let available = (width - WAVE_RIGHT_PADDING).max(6.0);
    available.min(WAVE_CONTAINER_WIDTH).min(width)
}

unsafe fn update_background_path(state: &OverlayState, width: f64) {
    let background_layer = state.background_layer();
    let frame_rect = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(width, OVERLAY_HEIGHT));
    let _: () = msg_send![background_layer, setFrame: frame_rect];
    let path_ref = create_background_path(width, OVERLAY_HEIGHT);
    if !path_ref.is_null() {
        let _: () = msg_send![background_layer, setPath: path_ref];
        CFRelease(path_ref as *const _);
    }
}

unsafe fn position_icon(state: &OverlayState, width: f64) {
    let icon = state.icon_view();
    let size = ICON_SIZE.min(width.max(0.0));
    let y = (OVERLAY_HEIGHT - size).max(0.0) / 2.0;
    let rect = NSRect::new(NSPoint::new(ICON_LEFT_PADDING, y), NSSize::new(size, size));
    let _: () = msg_send![icon, setFrame: rect];
}

unsafe fn position_label(state: &OverlayState, width: f64) {
    let label = state.label();
    let _ = width;
    let _: () = msg_send![label, setHidden: YES];
}

unsafe fn position_waves_container(state: &OverlayState, width: f64) {
    let container = state.waves_container();
    let container_width = wave_container_width(width);
    let x = (width - container_width - WAVE_RIGHT_PADDING).max(0.0);
    let height = OVERLAY_HEIGHT - WAVE_VERTICAL_PADDING * 2.0;
    let rect = NSRect::new(
        NSPoint::new(x.max(0.0), WAVE_VERTICAL_PADDING),
        NSSize::new(container_width, height.max(6.0)),
    );
    let _: () = msg_send![container, setFrame: rect];
}

unsafe fn update_gradient_layers(state: &OverlayState) {
    let container = state.waves_container();
    let bounds: NSRect = msg_send![container, bounds];
    let left = state.gradient_left();
    let right = state.gradient_right();
    let expanded = NSRect::new(
        NSPoint::new(bounds.origin.x - 2.0, bounds.origin.y),
        NSSize::new(bounds.size.width + 4.0, bounds.size.height),
    );
    let left_frame = expanded;
    let right_frame = NSRect::new(
        NSPoint::new(bounds.origin.x - 2.0, bounds.origin.y),
        NSSize::new(bounds.size.width + 4.0, bounds.size.height),
    );
    let _: () = msg_send![left, setFrame: left_frame];
    let _: () = msg_send![right, setFrame: right_frame];
}

unsafe fn update_wave_paths(state: &OverlayState) {
    let container = state.waves_container();
    let bounds: NSRect = msg_send![container, bounds];
    let width = bounds.size.width.max(2.0);
    let height = bounds.size.height.max(6.0);
    let baseline = height / 2.0;

    for index in 0..WAVE_COUNT {
        if let Some(layer) = state.wave_layer(index) {
            let amplitude = (state.current_level * WAVE_AMPLITUDE_MULTIPLIERS[index])
                .clamp(0.03, 1.3);
            let vertical = (height * 0.75 * amplitude).max(1.0);
            let freq = WAVE_FREQUENCIES[index];
            let phase = state.phase + WAVE_PHASE_OFFSETS[index];
            let path_ref = create_wave_path(width, baseline, vertical, freq, phase);
            if !path_ref.is_null() {
                let _: () = msg_send![layer, setPath: path_ref];
                CFRelease(path_ref as *const _);
            }
        }
    }
}

fn animate_panel(opening: bool, animation_id: u64) {
    for step in 0..=ANIMATION_STEPS {
        let normalized = step as f64 / ANIMATION_STEPS as f64;
        let eased = ease_out(normalized);
        let progress = if opening { eased } else { 1.0 - eased };
        let delay = Duration::from_secs_f64(normalized * ANIMATION_DURATION);
        Queue::main().exec_after(delay, move || {
            OVERLAY_STATE.with(|cell| {
                let mut entry = cell.borrow_mut();
                if let Some(state) = entry.as_mut() {
                    if state.animation_id != animation_id {
                        return;
                    }

                    unsafe {
                        apply_overlay_progress(state, progress);
                        if !opening && step == ANIMATION_STEPS {
                            let panel = state.panel();
                            let _: () = msg_send![panel, orderOut: nil];
                        }
                    }
                }
            });
        });
    }
}

fn schedule_wave_frame(token: u64) {
    Queue::main().exec_after(Duration::from_millis(16), move || {
        OVERLAY_STATE.with(|cell| {
            let mut entry = cell.borrow_mut();
            if let Some(state) = entry.as_mut() {
                if state.wave_motion_id != token || !state.is_visible {
                    return;
                }

                state.current_level += (state.target_level - state.current_level) * LEVEL_SMOOTHING;
                if state.current_level < 0.0002 {
                    state.current_level = 0.0;
                }
                state.target_level *= TARGET_DECAY_PER_FRAME;
                if state.target_level < 0.0005 {
                    state.target_level = 0.0;
                }

                let advance = WAVE_BASE_PHASE_STEP + WAVE_PHASE_GAIN * state.current_level;
                state.phase = (state.phase + advance) % TAU;

                unsafe {
                    update_wave_paths(state);
                }

                schedule_wave_frame(token);
            }
        });
    });
}

unsafe fn update_active_app_icon(state: &OverlayState) {
    let icon_view = state.icon_view();
    let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
    let running_app: id = msg_send![workspace, frontmostApplication];
    if running_app != nil {
        let icon: id = msg_send![running_app, icon];
        if icon != nil {
            let size = NSSize::new(ICON_SIZE, ICON_SIZE);
            let _: () = msg_send![icon, setSize: size];
            let _: () = msg_send![icon_view, setImage: icon];
            return;
        }
    }

    let _: () = msg_send![icon_view, setImage: nil];
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

fn enqueue_on_main<F>(task: F)
where
    F: FnOnce() + Send + 'static,
{
    if is_main_thread() {
        task();
    } else {
        Queue::main().exec_async(task);
    }
}

fn is_main_thread() -> bool {
    unsafe { msg_send![class!(NSThread), isMainThread] }
}

fn create_background_path(width: f64, height: f64) -> core_graphics::sys::CGPathRef {
    unsafe {
        let path_ref = CGPathCreateMutable();
        if path_ref.is_null() {
            return ptr::null_mut();
        }

        let bottom_radius = (height * 0.42).clamp(6.0, 14.0);
        let control = bottom_radius * 0.5522847498; // approximates a circular corner

        // Start at top-right corner (square)
        CGPathMoveToPoint(path_ref, ptr::null(), width, height);

        // Right edge down to start of bottom-right corner
        CGPathAddLineToPoint(path_ref, ptr::null(), width, bottom_radius);

        // Bottom-right rounded corner
        CGPathAddCurveToPoint(
            path_ref,
            ptr::null(),
            width,
            bottom_radius - control,
            width - bottom_radius + control,
            0.0,
            width - bottom_radius,
            0.0,
        );

        // Bottom edge across
        CGPathAddLineToPoint(path_ref, ptr::null(), bottom_radius, 0.0);

        // Bottom-left rounded corner
        CGPathAddCurveToPoint(
            path_ref,
            ptr::null(),
            bottom_radius - control,
            0.0,
            0.0,
            bottom_radius - control,
            0.0,
            bottom_radius,
        );

        // Left edge up (square top-left corner)
        CGPathAddLineToPoint(path_ref, ptr::null(), 0.0, height);

        // Top edge back to start (square top-right corner)
        CGPathAddLineToPoint(path_ref, ptr::null(), width, height);

        CGPathCloseSubpath(path_ref);

        path_ref
    }
}

fn create_wave_path(
    width: f64,
    baseline: f64,
    amplitude: f64,
    frequency: f64,
    phase: f64,
) -> core_graphics::sys::CGPathRef {
    unsafe {
        let path_ref = CGPathCreateMutable();
        if path_ref.is_null() {
            return ptr::null_mut();
        }

        let segments = 72.max((width / 2.0) as usize);
        let mut t = 0.0;
        let step = 1.0 / segments as f64;

        let mut x = 0.0;
        let mut y = baseline + amplitude * (phase).sin();
        CGPathMoveToPoint(path_ref, ptr::null(), x, y);

        for _ in 0..=segments {
            t += step;
            if t > 1.0 {
                t = 1.0;
            }
            x = width * t;
            let theta = frequency * t * TAU + phase;
            y = baseline + amplitude * theta.sin();
            CGPathAddLineToPoint(path_ref, ptr::null(), x, y);
        }

        path_ref
    }
}
