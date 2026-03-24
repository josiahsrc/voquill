use std::cell::{Cell, RefCell};
use std::f64::consts::PI;
use std::rc::Rc;
use std::sync::mpsc::Receiver;
use std::time::Duration;

use gtk::cairo;
use gtk::gdk;
use gtk::glib::{self, ControlFlow};
use gtk::prelude::*;
use gtk_layer_shell::LayerShell;

use crate::ipc::{self, InMessage, OutMessage, Phase};

const TAU: f64 = PI * 2.0;

const WINDOW_WIDTH: i32 = 200;
const WINDOW_HEIGHT: i32 = 72;
const MARGIN_BOTTOM: i32 = 8;

// The pill draws in the bottom portion of the window; the tooltip floats above.
const PILL_AREA_TOP: f64 = 40.0;
const TOOLTIP_HEIGHT: f64 = 24.0;
const TOOLTIP_GAP: f64 = 6.0;
const TOOLTIP_RADIUS: f64 = 8.0;
const TOOLTIP_EXPAND_SPEED: f64 = 0.15;
const TOOLTIP_COLLAPSE_SPEED: f64 = 0.12;

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
    // Style selector
    style_count: Cell<u32>,
    style_name: RefCell<String>,
    tooltip_t: Cell<f64>,
    tooltip_width: Cell<f64>,
}

pub fn run(receiver: Receiver<InMessage>) {
    let use_layer_shell = gtk_layer_shell::is_supported();
    if !use_layer_shell {
        let display = gdk::Display::default().expect("display");
        if display.type_().name() != "GdkX11Display" {
            eprintln!("[pill] neither layer-shell nor X11 available");
            std::process::exit(1);
        }
    }

    let window = gtk::Window::new(gtk::WindowType::Toplevel);
    window.set_default_size(WINDOW_WIDTH, WINDOW_HEIGHT);
    window.set_decorated(false);
    window.set_app_paintable(true);

    // Set RGBA visual for transparency
    {
        let screen: gdk::Screen = gtk::prelude::WidgetExt::screen(&window).expect("screen");
        if let Some(visual) = screen.rgba_visual() {
            window.set_visual(Some(&visual));
        }
    }

    if use_layer_shell {
        window.init_layer_shell();
        window.set_layer(gtk_layer_shell::Layer::Overlay);
        window.set_anchor(gtk_layer_shell::Edge::Bottom, true);
        window.set_layer_shell_margin(gtk_layer_shell::Edge::Bottom, MARGIN_BOTTOM);
        window.set_keyboard_mode(gtk_layer_shell::KeyboardMode::None);
        window.set_exclusive_zone(-1);
        window.set_namespace("voquill-pill");
    } else {
        window.connect_realize(setup_x11_window);
    }

    let css = gtk::CssProvider::new();
    let _ = css.load_from_data(b"window { background: transparent; }");
    if let Some(screen) = gdk::Screen::default() {
        gtk::StyleContext::add_provider_for_screen(
            &screen,
            &css,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
    }

    let drawing_area = gtk::DrawingArea::new();
    drawing_area.set_size_request(WINDOW_WIDTH, WINDOW_HEIGHT);
    window.add(&drawing_area);

    let state = Rc::new(PillState {
        phase: Cell::new(Phase::Idle),
        expand_t: Cell::new(0.0),
        hovered: Cell::new(false),
        wave_phase: Cell::new(0.0),
        current_level: Cell::new(0.0),
        target_level: Cell::new(0.0),
        loading_offset: Cell::new(0.0),
        pending_levels: RefCell::new(Vec::new()),
        style_count: Cell::new(0),
        style_name: RefCell::new(String::new()),
        tooltip_t: Cell::new(0.0),
        tooltip_width: Cell::new(0.0),
    });

    window.add_events(
        gdk::EventMask::ENTER_NOTIFY_MASK
            | gdk::EventMask::LEAVE_NOTIFY_MASK
            | gdk::EventMask::BUTTON_RELEASE_MASK,
    );

    let state_enter = state.clone();
    window.connect_enter_notify_event(move |_, _| {
        state_enter.hovered.set(true);
        ipc::send(&OutMessage::Hover { hovered: true });
        glib::Propagation::Proceed
    });

    let state_leave = state.clone();
    window.connect_leave_notify_event(move |_, _| {
        state_leave.hovered.set(false);
        ipc::send(&OutMessage::Hover { hovered: false });
        glib::Propagation::Proceed
    });

    let state_click = state.clone();
    window.connect_button_release_event(move |_, event| {
        let (x, y) = event.position();
        handle_click(&state_click, x, y);
        glib::Propagation::Proceed
    });

    let state_draw = state.clone();
    drawing_area.connect_draw(move |_area, cr| {
        draw_all(cr, &state_draw);
        glib::Propagation::Proceed
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
                InMessage::StyleInfo { count, name } => {
                    state_tick.style_count.set(count);
                    *state_tick.style_name.borrow_mut() = name;
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
        update_input_region(&da, &state_tick);
        da.queue_draw();
        ControlFlow::Continue
    });

    window.show_all();
    ipc::send(&OutMessage::Ready);

    if use_layer_shell {
        let window_ref = window.clone();
        let quit_monitor = quit_flag.clone();
        let last_geom: Rc<Cell<(i32, i32, i32, i32)>> = Rc::new(Cell::new((0, 0, 0, 0)));
        glib::timeout_add_local(Duration::from_millis(100), move || {
            if quit_monitor.get() {
                return ControlFlow::Break;
            }
            let display = match gdk::Display::default() {
                Some(d) => d,
                None => return ControlFlow::Continue,
            };
            let seat = match display.default_seat() {
                Some(s) => s,
                None => return ControlFlow::Continue,
            };
            let pointer = match seat.pointer() {
                Some(p) => p,
                None => return ControlFlow::Continue,
            };
            let (_, x, y) = pointer.position();
            if let Some(monitor) = display.monitor_at_point(x, y) {
                let g = monitor.geometry();
                let new_geom = (g.x(), g.y(), g.width(), g.height());
                if new_geom != last_geom.get() {
                    last_geom.set(new_geom);
                    window_ref.set_monitor(&monitor);
                }
            }
            ControlFlow::Continue
        });
    }

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

    // Tooltip animation
    let show_tooltip = state.style_count.get() > 1
        && (hovered || phase == Phase::Recording)
        && state.expand_t.get() > 0.3;
    let tooltip_target = if show_tooltip { 1.0 } else { 0.0 };
    let tooltip_current = state.tooltip_t.get();
    let tooltip_speed = if tooltip_target > tooltip_current {
        TOOLTIP_EXPAND_SPEED
    } else {
        TOOLTIP_COLLAPSE_SPEED
    };
    let new_tt = (tooltip_current + (tooltip_target - tooltip_current) * tooltip_speed).clamp(0.0, 1.0);
    let snapped_tt = if (new_tt - tooltip_target).abs() < 0.005 { tooltip_target } else { new_tt };
    state.tooltip_t.set(snapped_tt);
}

fn update_input_region(da: &gtk::DrawingArea, state: &PillState) {
    let Some(gdk_window) = da.window() else { return };

    let expand_t = state.expand_t.get();
    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let pill_rx = ((WINDOW_WIDTH as f64 - pill_w) / 2.0) as i32;
    let pill_ry = (PILL_AREA_TOP + (EXPANDED_PILL_HEIGHT - pill_h) / 2.0) as i32;

    let tooltip_t = state.tooltip_t.get();
    let tooltip_w = state.tooltip_width.get();

    if tooltip_t > 0.1 && tooltip_w > 0.0 {
        let tooltip_top = (PILL_AREA_TOP - TOOLTIP_GAP - TOOLTIP_HEIGHT) as i32;
        let region_w = (tooltip_w.ceil() as i32).max(pill_w.ceil() as i32);
        let region_rx = ((WINDOW_WIDTH as f64 - region_w as f64) / 2.0) as i32;
        let region_h = pill_ry + pill_h.ceil() as i32 - tooltip_top;
        let rect = cairo::RectangleInt::new(region_rx, tooltip_top, region_w, region_h);
        let region = cairo::Region::create_rectangle(&rect);
        gdk_window.input_shape_combine_region(&region, 0, 0);
    } else {
        let rect = cairo::RectangleInt::new(pill_rx, pill_ry, pill_w.ceil() as i32, pill_h.ceil() as i32);
        let region = cairo::Region::create_rectangle(&rect);
        gdk_window.input_shape_combine_region(&region, 0, 0);
    }
}

fn draw_all(cr: &cairo::Context, state: &PillState) {
    cr.set_operator(cairo::Operator::Source);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.0);
    let _ = cr.paint();
    cr.set_operator(cairo::Operator::Over);

    draw_tooltip(cr, state);
    draw_pill(cr, state);
}

fn draw_pill(cr: &cairo::Context, state: &PillState) {
    let w = WINDOW_WIDTH as f64;
    let expand_t = state.expand_t.get();

    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let bg_alpha = lerp(IDLE_BG_ALPHA, ACTIVE_BG_ALPHA, expand_t);
    let radius = lerp(COLLAPSED_RADIUS, EXPANDED_RADIUS, expand_t);

    let rx = (w - pill_w) / 2.0;
    let ry = PILL_AREA_TOP + (EXPANDED_PILL_HEIGHT - pill_h) / 2.0;

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

fn draw_tooltip(cr: &cairo::Context, state: &PillState) {
    let tooltip_t = state.tooltip_t.get();
    if tooltip_t < 0.01 {
        return;
    }

    let style_name = state.style_name.borrow();
    if state.style_count.get() <= 1 || style_name.is_empty() {
        return;
    }

    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Bold);
    cr.set_font_size(11.0);
    let text_extents = cr.text_extents(&style_name).unwrap();
    let text_w = text_extents.width().clamp(20.0, 100.0);

    let chevron_area = 20.0;
    let padding_h = 10.0;
    let tooltip_w = padding_h * 2.0 + chevron_area * 2.0 + text_w;
    state.tooltip_width.set(tooltip_w);

    let w = WINDOW_WIDTH as f64;
    let tooltip_rx = (w - tooltip_w) / 2.0;
    let y_offset = (1.0 - tooltip_t) * 4.0;
    let tooltip_ry = PILL_AREA_TOP - TOOLTIP_GAP - TOOLTIP_HEIGHT + y_offset;
    let alpha = tooltip_t;

    // Background
    rounded_rect(cr, tooltip_rx, tooltip_ry, tooltip_w, TOOLTIP_HEIGHT, TOOLTIP_RADIUS);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.92 * alpha);
    let _ = cr.fill();

    // Border
    rounded_rect(
        cr,
        tooltip_rx + 0.5,
        tooltip_ry + 0.5,
        tooltip_w - 1.0,
        TOOLTIP_HEIGHT - 1.0,
        TOOLTIP_RADIUS - 0.5,
    );
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.2 * alpha);
    cr.set_line_width(1.0);
    let _ = cr.stroke();

    let center_y = tooltip_ry + TOOLTIP_HEIGHT / 2.0;

    // Left chevron
    let left_cx = tooltip_rx + padding_h + 5.0;
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.8 * alpha);
    cr.set_line_width(1.5);
    cr.set_line_cap(cairo::LineCap::Round);
    cr.set_line_join(cairo::LineJoin::Round);
    cr.move_to(left_cx + 3.0, center_y - 4.0);
    cr.line_to(left_cx - 3.0, center_y);
    cr.line_to(left_cx + 3.0, center_y + 4.0);
    let _ = cr.stroke();

    // Right chevron
    let right_cx = tooltip_rx + tooltip_w - padding_h - 5.0;
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.8 * alpha);
    cr.set_line_width(1.5);
    cr.set_line_cap(cairo::LineCap::Round);
    cr.set_line_join(cairo::LineJoin::Round);
    cr.move_to(right_cx - 3.0, center_y - 4.0);
    cr.line_to(right_cx + 3.0, center_y);
    cr.line_to(right_cx - 3.0, center_y + 4.0);
    let _ = cr.stroke();

    // Style name text (centered between chevrons)
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.9 * alpha);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Bold);
    cr.set_font_size(11.0);
    let text_area_left = tooltip_rx + padding_h + chevron_area;
    let text_area_right = tooltip_rx + tooltip_w - padding_h - chevron_area;
    let text_area_center = (text_area_left + text_area_right) / 2.0;
    let tx = text_area_center - text_extents.width() / 2.0 - text_extents.x_bearing();
    let ty = center_y - text_extents.height() / 2.0 - text_extents.y_bearing();

    // Clip text to available area
    cr.save().ok();
    cr.rectangle(text_area_left, tooltip_ry, text_area_right - text_area_left, TOOLTIP_HEIGHT);
    cr.clip();
    cr.move_to(tx, ty);
    let _ = cr.show_text(&style_name);
    cr.restore().ok();
}

fn handle_click(state: &PillState, x: f64, y: f64) {
    let tooltip_t = state.tooltip_t.get();
    let tooltip_w = state.tooltip_width.get();
    let tooltip_ry = PILL_AREA_TOP - TOOLTIP_GAP - TOOLTIP_HEIGHT;

    // Check tooltip area first
    if tooltip_t > 0.5 && state.style_count.get() > 1 && tooltip_w > 0.0 {
        let w = WINDOW_WIDTH as f64;
        let tooltip_rx = (w - tooltip_w) / 2.0;

        if y >= tooltip_ry && y <= tooltip_ry + TOOLTIP_HEIGHT
            && x >= tooltip_rx && x <= tooltip_rx + tooltip_w
        {
            let mid_x = tooltip_rx + tooltip_w / 2.0;
            if x < mid_x {
                ipc::send(&OutMessage::StyleSwitch {
                    direction: "backward".to_string(),
                });
            } else {
                ipc::send(&OutMessage::StyleSwitch {
                    direction: "forward".to_string(),
                });
            }
            return;
        }
    }

    // Check pill area
    let expand_t = state.expand_t.get();
    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let pill_rx = (WINDOW_WIDTH as f64 - pill_w) / 2.0;
    let pill_ry = PILL_AREA_TOP + (EXPANDED_PILL_HEIGHT - pill_h) / 2.0;

    if x >= pill_rx && x <= pill_rx + pill_w && y >= pill_ry && y <= pill_ry + pill_h {
        ipc::send(&OutMessage::Click);
    }
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

fn setup_x11_window(window: &gtk::Window) {
    use std::ffi::{c_char, c_int, c_uchar, c_uint, c_ulong, c_void};

    type XDisplay = c_void;
    type XWindow = c_ulong;
    type XAtom = c_ulong;

    const XA_ATOM: XAtom = 4;

    extern "C" {
        fn gdk_x11_display_get_xdisplay(display: *mut c_void) -> *mut XDisplay;
        fn gdk_x11_window_get_xid(window: *mut c_void) -> XWindow;
    }

    #[link(name = "X11")]
    extern "C" {
        fn XInternAtom(
            display: *mut XDisplay, name: *const c_char, only_if_exists: c_int,
        ) -> XAtom;
        fn XChangeProperty(
            display: *mut XDisplay, w: XWindow, property: XAtom, type_: XAtom,
            format: c_int, mode: c_int, data: *const c_uchar, nelements: c_int,
        ) -> c_int;
        fn XMoveWindow(display: *mut XDisplay, w: XWindow, x: c_int, y: c_int) -> c_int;
        fn XFlush(display: *mut XDisplay) -> c_int;
        fn XDefaultRootWindow(display: *mut XDisplay) -> XWindow;
        fn XQueryPointer(
            display: *mut XDisplay, w: XWindow,
            root_return: *mut XWindow, child_return: *mut XWindow,
            root_x_return: *mut c_int, root_y_return: *mut c_int,
            win_x_return: *mut c_int, win_y_return: *mut c_int,
            mask_return: *mut c_uint,
        ) -> c_int;
    }

    let display = window.display();
    let gdk_window = window.window().expect("window after realize");

    let xdisplay = unsafe {
        gdk_x11_display_get_xdisplay(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkDisplay>::to_glib_none(&display).0
                as *mut c_void,
        )
    };
    let xwindow = unsafe {
        gdk_x11_window_get_xid(
            glib::translate::ToGlibPtr::<*mut gdk::ffi::GdkWindow>::to_glib_none(&gdk_window).0
                as *mut c_void,
        )
    };

    // Set window type and state
    unsafe {
        let intern = |name: &[u8]| -> XAtom {
            XInternAtom(xdisplay, name.as_ptr() as *const c_char, 0)
        };

        let wm_window_type = intern(b"_NET_WM_WINDOW_TYPE\0");
        let type_dock = intern(b"_NET_WM_WINDOW_TYPE_DOCK\0");
        XChangeProperty(
            xdisplay, xwindow, wm_window_type, XA_ATOM, 32, 0,
            &type_dock as *const XAtom as *const c_uchar, 1,
        );

        let wm_state = intern(b"_NET_WM_STATE\0");
        let states = [
            intern(b"_NET_WM_STATE_ABOVE\0"),
            intern(b"_NET_WM_STATE_STICKY\0"),
            intern(b"_NET_WM_STATE_SKIP_TASKBAR\0"),
            intern(b"_NET_WM_STATE_SKIP_PAGER\0"),
        ];
        XChangeProperty(
            xdisplay, xwindow, wm_state, XA_ATOM, 32, 0,
            states.as_ptr() as *const c_uchar, states.len() as c_int,
        );

        XFlush(xdisplay);
    }

    // Find pill position for the monitor containing the cursor
    let cursor_pos = move || -> (c_int, c_int) {
        unsafe {
            let root = XDefaultRootWindow(xdisplay);
            let (mut rx, mut ry) = (0 as c_int, 0 as c_int);
            let (mut dw1, mut dw2) = (0 as XWindow, 0 as XWindow);
            let (mut dx, mut dy) = (0 as c_int, 0 as c_int);
            let mut dm: c_uint = 0;
            XQueryPointer(
                xdisplay, root, &mut dw1, &mut dw2,
                &mut rx, &mut ry, &mut dx, &mut dy, &mut dm,
            );
            (rx, ry)
        }
    };

    let pill_pos_on_monitor =
        |cx: c_int, cy: c_int, disp: &gdk::Display| -> Option<(c_int, c_int)> {
            let n = disp.n_monitors();
            for i in 0..n {
                let monitor = disp.monitor(i)?;
                let g = monitor.geometry();
                let scale = monitor.scale_factor();
                // GDK geometry is in logical pixels; X11 cursor coords are physical.
                let phys_x = g.x() * scale;
                let phys_y = g.y() * scale;
                let phys_w = g.width() * scale;
                let phys_h = g.height() * scale;
                if cx >= phys_x && cx < phys_x + phys_w
                    && cy >= phys_y && cy < phys_y + phys_h
                {
                    let win_w = WINDOW_WIDTH * scale;
                    let win_h = WINDOW_HEIGHT * scale;
                    let margin = MARGIN_BOTTOM * scale;
                    return Some((
                        phys_x + (phys_w - win_w) / 2,
                        phys_y + phys_h - win_h - margin,
                    ));
                }
            }
            None
        };

    let (cx, cy) = cursor_pos();
    let init_pos = pill_pos_on_monitor(cx, cy, &display).unwrap_or((0, 0));
    unsafe {
        XMoveWindow(xdisplay, xwindow, init_pos.0, init_pos.1);
        XFlush(xdisplay);
    }

    // Track cursor and reposition when it moves to a different monitor
    let last_pos = Rc::new(Cell::new(init_pos));
    glib::timeout_add_local(Duration::from_millis(100), move || {
        let (cx, cy) = cursor_pos();
        if let Some((new_x, new_y)) = pill_pos_on_monitor(cx, cy, &display) {
            let prev = last_pos.get();
            if new_x != prev.0 || new_y != prev.1 {
                last_pos.set((new_x, new_y));
                unsafe {
                    XMoveWindow(xdisplay, xwindow, new_x, new_y);
                    XFlush(xdisplay);
                }
            }
        }
        ControlFlow::Continue
    });
}
