use std::cell::{Cell, RefCell};
use std::f64::consts::PI;
use std::rc::Rc;
use std::sync::mpsc::Receiver;
use std::time::Duration;

use gtk4::cairo;
use gtk4::gdk;
use gtk4::glib::{self, ControlFlow};
use gtk4::prelude::*;
use gtk4_layer_shell::LayerShell;

use crate::ipc::{self, InMessage, OutMessage, Phase};

const TAU: f64 = PI * 2.0;

const WINDOW_WIDTH: i32 = 120;
const WINDOW_HEIGHT: i32 = 32;
const MARGIN_BOTTOM: i32 = 8;

const MIN_PILL_WIDTH: f64 = 48.0;
const MIN_PILL_HEIGHT: f64 = 6.0;
const EXPANDED_PILL_WIDTH: f64 = 120.0;
const EXPANDED_PILL_HEIGHT: f64 = 32.0;

const COLLAPSED_RADIUS: f64 = 6.0;
const EXPANDED_RADIUS: f64 = 16.0;
const IDLE_BG_ALPHA: f64 = 0.6;
const ACTIVE_BG_ALPHA: f64 = 0.92;
const BORDER_ALPHA: f64 = 0.3;

const EXPAND_SPEED: f64 = 0.12;
const COLLAPSE_SPEED: f64 = 0.08;

// Waveform — ported from AudioWaveform.tsx
const LEVEL_SMOOTHING: f64 = 0.18;
const TARGET_DECAY_PER_FRAME: f64 = 0.985;
const WAVE_BASE_PHASE_STEP: f64 = 0.11;
const WAVE_PHASE_GAIN: f64 = 0.32;
const MIN_AMPLITUDE: f64 = 0.03;
const MAX_AMPLITUDE: f64 = 1.3;
const STROKE_WIDTH: f64 = 1.6;
const PROCESSING_BASE_LEVEL: f64 = 0.16;

struct WaveConfig {
    frequency: f64,
    multiplier: f64,
    phase_offset: f64,
    opacity: f64,
}

const WAVE_CONFIGS: &[WaveConfig] = &[
    WaveConfig { frequency: 0.8, multiplier: 1.6, phase_offset: 0.0, opacity: 1.0 },
    WaveConfig { frequency: 1.0, multiplier: 1.35, phase_offset: 0.85, opacity: 0.78 },
    WaveConfig { frequency: 1.25, multiplier: 1.05, phase_offset: 1.7, opacity: 0.56 },
];

// Loading — MUI LinearProgress indeterminate style
const LOADING_BAR_WIDTH_FRAC: f64 = 0.4;
const LOADING_SPEED: f64 = 0.015;

struct PillState {
    phase: Cell<Phase>,
    expand_t: Cell<f64>,
    hovered: Cell<bool>,
    // Waveform animation state (matching AudioWaveform.tsx AnimationState)
    wave_phase: Cell<f64>,
    current_level: Cell<f64>,
    target_level: Cell<f64>,
    // Loading animation
    loading_offset: Cell<f64>,
    pending_levels: RefCell<Vec<f32>>,
}

pub fn run(receiver: Receiver<InMessage>) {
    if !gtk4_layer_shell::is_supported() {
        eprintln!("[pill] layer-shell not supported by compositor");
        std::process::exit(1);
    }

    let window = gtk4::Window::new();
    window.set_default_size(WINDOW_WIDTH, WINDOW_HEIGHT);
    window.set_decorated(false);

    window.init_layer_shell();
    window.set_layer(gtk4_layer_shell::Layer::Overlay);
    window.set_anchor(gtk4_layer_shell::Edge::Bottom, true);
    window.set_margin(gtk4_layer_shell::Edge::Bottom, MARGIN_BOTTOM);
    window.set_keyboard_mode(gtk4_layer_shell::KeyboardMode::None);
    window.set_exclusive_zone(-1);
    window.set_namespace(Some("voquill-pill"));

    let css = gtk4::CssProvider::new();
    css.load_from_data("window { background: transparent; }");
    gtk4::style_context_add_provider_for_display(
        &gdk::Display::default().expect("display"),
        &css,
        gtk4::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );

    let drawing_area = gtk4::DrawingArea::new();
    drawing_area.set_content_width(WINDOW_WIDTH);
    drawing_area.set_content_height(WINDOW_HEIGHT);
    window.set_child(Some(&drawing_area));

    let state = Rc::new(PillState {
        phase: Cell::new(Phase::Idle),
        expand_t: Cell::new(0.0),
        hovered: Cell::new(false),
        wave_phase: Cell::new(0.0),
        current_level: Cell::new(0.0),
        target_level: Cell::new(0.0),
        loading_offset: Cell::new(0.0),
        pending_levels: RefCell::new(Vec::new()),
    });

    let motion = gtk4::EventControllerMotion::new();
    let state_enter = state.clone();
    motion.connect_enter(move |_, _, _| {
        state_enter.hovered.set(true);
        ipc::send(&OutMessage::Hover { hovered: true });
    });
    let state_leave = state.clone();
    motion.connect_leave(move |_| {
        state_leave.hovered.set(false);
        ipc::send(&OutMessage::Hover { hovered: false });
    });
    window.add_controller(motion);

    let click = gtk4::GestureClick::new();
    click.connect_released(move |_, _, _, _| {
        ipc::send(&OutMessage::Click);
    });
    window.add_controller(click);

    let state_draw = state.clone();
    drawing_area.set_draw_func(move |_area, cr, _w, _h| {
        draw_pill(cr, &state_draw);
    });

    let receiver = Rc::new(RefCell::new(receiver));
    let state_tick = state.clone();
    let da = drawing_area.clone();
    let quit_flag = Rc::new(Cell::new(false));
    let quit_tick = quit_flag.clone();
    glib::timeout_add_local(Duration::from_millis(16), move || {
        let rx = receiver.borrow();
        while let Ok(msg) = rx.try_recv() {
            match msg {
                InMessage::Phase { phase } => {
                    let prev = state_tick.phase.get();
                    state_tick.phase.set(phase);
                    if phase == Phase::Idle && prev != Phase::Idle {
                        state_tick.target_level.set(0.0);
                        state_tick.current_level.set(0.0);
                        state_tick.wave_phase.set(0.0);
                    }
                }
                InMessage::Levels { levels } => {
                    *state_tick.pending_levels.borrow_mut() = levels;
                }
                InMessage::Quit => {
                    quit_tick.set(true);
                }
            }
        }

        if quit_tick.get() {
            return ControlFlow::Break;
        }

        tick(&state_tick);
        update_input_region(&da, state_tick.expand_t.get());
        da.queue_draw();
        ControlFlow::Continue
    });

    window.present();
    ipc::send(&OutMessage::Ready);

    let main_loop = glib::MainLoop::new(None, false);
    let ml = main_loop.clone();
    let _quit_watch = glib::timeout_add_local(Duration::from_millis(100), move || {
        if quit_flag.get() {
            ml.quit();
            return ControlFlow::Break;
        }
        ControlFlow::Continue
    });
    main_loop.run();
}

fn tick(state: &PillState) {
    let phase = state.phase.get();
    let is_active = phase != Phase::Idle;
    let is_recording = phase == Phase::Recording;
    let is_loading = phase == Phase::Loading;
    let hovered = state.hovered.get();

    // Process incoming audio levels (matching AudioWaveform.tsx level processing)
    if is_recording {
        let levels = state.pending_levels.borrow();
        if !levels.is_empty() {
            let sum: f64 = levels.iter().map(|v| *v as f64).sum();
            let avg = sum / levels.len() as f64;
            let peak = levels.iter().copied().fold(0.0_f32, f32::max) as f64;
            let combined = (avg * 0.9 + peak * 0.85).min(1.0);
            let boosted = (combined.sqrt() * 1.35).min(1.0);
            let target = state.target_level.get();
            state.target_level.set((target * 0.25 + boosted * 0.75).min(1.0));
        }
    } else if is_loading {
        let target = state.target_level.get();
        state.target_level.set(target.max(PROCESSING_BASE_LEVEL));
    } else {
        state.target_level.set(0.0);
        state.current_level.set(state.current_level.get() * 0.4);
        if state.current_level.get() < 0.0002 {
            state.current_level.set(0.0);
        }
    }

    // Smooth current level toward target
    let current = state.current_level.get();
    let target = state.target_level.get();
    let new_current = current + (target - current) * LEVEL_SMOOTHING;
    state.current_level.set(if new_current < 0.0002 { 0.0 } else { new_current });

    // Decay target
    let decayed = target * TARGET_DECAY_PER_FRAME;
    state.target_level.set(if decayed < 0.0005 { 0.0 } else { decayed });

    // Advance wave phase based on level
    let level = state.current_level.get();
    let base_level = if is_loading && !is_recording { PROCESSING_BASE_LEVEL } else { 0.0 };
    let effective_level = level.max(base_level);
    let advance = WAVE_BASE_PHASE_STEP + WAVE_PHASE_GAIN * effective_level;
    state.wave_phase.set((state.wave_phase.get() + advance) % TAU);

    // Expand/collapse animation
    let expand_target = if is_active || hovered { 1.0 } else { 0.0 };
    let expand_current = state.expand_t.get();
    let speed = if expand_target > expand_current { EXPAND_SPEED } else { COLLAPSE_SPEED };
    let new_t = (expand_current + (expand_target - expand_current) * speed).clamp(0.0, 1.0);
    let snapped = if (new_t - expand_target).abs() < 0.005 { expand_target } else { new_t };
    state.expand_t.set(snapped);

    // Loading offset
    if is_loading {
        state.loading_offset.set((state.loading_offset.get() + LOADING_SPEED) % 1.0);
    }
}

fn update_input_region(da: &gtk4::DrawingArea, expand_t: f64) {
    let Some(native) = da.native() else { return };
    let Some(surface) = native.surface() else { return };

    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let rx = ((WINDOW_WIDTH as f64 - pill_w) / 2.0) as i32;
    let ry = ((WINDOW_HEIGHT as f64 - pill_h) / 2.0) as i32;

    let rect = cairo::RectangleInt::new(rx, ry, pill_w as i32, pill_h as i32);
    let region = cairo::Region::create_rectangle(&rect);
    surface.set_input_region(&region);
}

fn draw_pill(cr: &cairo::Context, state: &PillState) {
    let w = WINDOW_WIDTH as f64;
    let h = WINDOW_HEIGHT as f64;
    let expand_t = state.expand_t.get();

    // Clear to transparent
    cr.set_operator(cairo::Operator::Source);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.0);
    let _ = cr.paint();
    cr.set_operator(cairo::Operator::Over);

    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let bg_alpha = lerp(IDLE_BG_ALPHA, ACTIVE_BG_ALPHA, expand_t);
    let radius = lerp(COLLAPSED_RADIUS, EXPANDED_RADIUS, expand_t);

    let rx = (w - pill_w) / 2.0;
    let ry = (h - pill_h) / 2.0;

    // Background fill
    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.set_source_rgba(0.0, 0.0, 0.0, bg_alpha);
    let _ = cr.fill();

    // Border (1px white at 0.3 opacity)
    rounded_rect(cr, rx + 0.5, ry + 0.5, pill_w - 1.0, pill_h - 1.0, radius - 0.5);
    cr.set_source_rgba(1.0, 1.0, 1.0, BORDER_ALPHA);
    cr.set_line_width(1.0);
    let _ = cr.stroke();

    match state.phase.get() {
        Phase::Recording if expand_t > 0.1 => {
            draw_waveform(cr, rx, ry, pill_w, pill_h, expand_t, state);
            draw_edge_gradient(cr, rx, ry, pill_w, pill_h, radius, expand_t);
        }
        Phase::Loading if expand_t > 0.1 => {
            draw_loading(cr, rx, ry, pill_w, pill_h, radius, expand_t, state);
        }
        Phase::Idle if expand_t > 0.5 && state.hovered.get() => {
            draw_idle_label(cr, rx, ry, pill_w, pill_h, expand_t);
        }
        _ => {}
    }
}

fn draw_waveform(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    expand_t: f64,
    state: &PillState,
) {
    let wave_phase = state.wave_phase.get();
    let level = state.current_level.get();
    let baseline = ry + pill_h / 2.0;

    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, pill_h / 2.0);
    cr.clip();

    for config in WAVE_CONFIGS {
        let amplitude_factor = (level * config.multiplier).clamp(MIN_AMPLITUDE, MAX_AMPLITUDE);
        let amplitude = (pill_h * 0.75 * amplitude_factor).max(1.0);
        let phase = wave_phase + config.phase_offset;
        let alpha = config.opacity * expand_t;

        cr.set_source_rgba(1.0, 1.0, 1.0, alpha);
        cr.set_line_width(STROKE_WIDTH);
        cr.set_line_cap(cairo::LineCap::Round);
        cr.set_line_join(cairo::LineJoin::Round);

        let segments = (pill_w / 2.0).max(72.0) as i32;
        for i in 0..=segments {
            let t = i as f64 / segments as f64;
            let x = rx + pill_w * t;
            let theta = config.frequency * t * TAU + phase;
            let y = baseline + amplitude * theta.sin();

            if i == 0 {
                cr.move_to(x, y);
            } else {
                cr.line_to(x, y);
            }
        }
        let _ = cr.stroke();
    }

    cr.restore().ok();
}

fn draw_edge_gradient(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    radius: f64,
    expand_t: f64,
) {
    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.clip();

    let alpha = 0.9 * expand_t;

    // Left edge fade
    let left_grad = cairo::LinearGradient::new(rx, 0.0, rx + pill_w * 0.18, 0.0);
    left_grad.add_color_stop_rgba(0.0, 0.0, 0.0, 0.0, alpha);
    left_grad.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.0);
    cr.set_source(&left_grad).ok();
    cr.rectangle(rx, ry, pill_w * 0.18, pill_h);
    let _ = cr.fill();

    // Right edge fade
    let right_start = rx + pill_w * 0.85;
    let right_grad = cairo::LinearGradient::new(right_start, 0.0, rx + pill_w, 0.0);
    right_grad.add_color_stop_rgba(0.0, 0.0, 0.0, 0.0, 0.0);
    right_grad.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, alpha);
    cr.set_source(&right_grad).ok();
    cr.rectangle(right_start, ry, pill_w * 0.15, pill_h);
    let _ = cr.fill();

    cr.restore().ok();
}

fn draw_loading(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    radius: f64,
    expand_t: f64,
    state: &PillState,
) {
    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.clip();

    let bar_h = 2.0;
    let bar_y = ry + (pill_h - bar_h) / 2.0;
    let bar_w = pill_w * LOADING_BAR_WIDTH_FRAC;
    let offset = state.loading_offset.get();
    let bar_x = rx + (pill_w + bar_w) * offset - bar_w;

    let alpha = 0.7 * expand_t;
    let gradient = cairo::LinearGradient::new(bar_x, 0.0, bar_x + bar_w, 0.0);
    gradient.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 0.0);
    gradient.add_color_stop_rgba(0.5, 1.0, 1.0, 1.0, alpha);
    gradient.add_color_stop_rgba(1.0, 1.0, 1.0, 1.0, 0.0);
    cr.set_source(&gradient).ok();
    cr.rectangle(bar_x, bar_y, bar_w, bar_h);
    let _ = cr.fill();

    cr.restore().ok();
}

fn draw_idle_label(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    expand_t: f64,
) {
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.4 * expand_t);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Bold);
    cr.set_font_size(11.0);
    let text = "Click to dictate";
    let extents = cr.text_extents(text).unwrap();
    let tx = rx + (pill_w - extents.width()) / 2.0 - extents.x_bearing();
    let ty = ry + (pill_h - extents.height()) / 2.0 - extents.y_bearing();
    cr.move_to(tx, ty);
    let _ = cr.show_text(text);
}

fn rounded_rect(cr: &cairo::Context, x: f64, y: f64, w: f64, h: f64, r: f64) {
    let r = r.min(w / 2.0).min(h / 2.0);
    cr.new_sub_path();
    cr.arc(x + w - r, y + r, r, -PI / 2.0, 0.0);
    cr.arc(x + w - r, y + h - r, r, 0.0, PI / 2.0);
    cr.arc(x + r, y + h - r, r, PI / 2.0, PI);
    cr.arc(x + r, y + r, r, PI, 3.0 * PI / 2.0);
    cr.close_path();
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}
