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

const WINDOW_WIDTH: i32 = 120;
const WINDOW_HEIGHT: i32 = 32;
const MARGIN_BOTTOM: i32 = 8;

const MIN_PILL_WIDTH: f64 = 48.0;
const MIN_PILL_HEIGHT: f64 = 6.0;
const EXPANDED_PILL_WIDTH: f64 = 120.0;
const EXPANDED_PILL_HEIGHT: f64 = 32.0;

const IDLE_OPACITY: f64 = 0.6;
const ACTIVE_OPACITY: f64 = 1.0;

const EXPAND_SPEED: f64 = 0.12;
const COLLAPSE_SPEED: f64 = 0.08;

const WAVEFORM_LAYERS: usize = 3;
const WAVEFORM_SMOOTHING: f64 = 0.15;

struct PillState {
    phase: Cell<Phase>,
    expand_t: Cell<f64>,
    phase_time: Cell<f64>,
    smoothed_level: Cell<f64>,
    hovered: Cell<bool>,
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
        phase_time: Cell::new(0.0),
        smoothed_level: Cell::new(0.0),
        hovered: Cell::new(false),
        loading_offset: Cell::new(0.0),
        pending_levels: RefCell::new(Vec::new()),
    });

    // Hover detection
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

    // Draw function
    let state_draw = state.clone();
    drawing_area.set_draw_func(move |_area, cr, _w, _h| {
        draw_pill(cr, &state_draw);
    });

    // Animation tick — also drains IPC messages
    let receiver = Rc::new(RefCell::new(receiver));
    let state_tick = state.clone();
    let da = drawing_area.clone();
    let quit_flag = Rc::new(Cell::new(false));
    let quit_tick = quit_flag.clone();
    glib::timeout_add_local(Duration::from_millis(16), move || {
        // Drain pending IPC messages
        let rx = receiver.borrow();
        while let Ok(msg) = rx.try_recv() {
            match msg {
                InMessage::Phase { phase } => {
                    state_tick.phase.set(phase);
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
    let hovered = state.hovered.get();

    let levels = state.pending_levels.borrow();
    let raw_level = if levels.is_empty() {
        0.0
    } else {
        levels.iter().copied().fold(0.0_f32, f32::max) as f64
    };
    drop(levels);
    let prev = state.smoothed_level.get();
    state
        .smoothed_level
        .set(prev + (raw_level - prev) * WAVEFORM_SMOOTHING);

    let target = if is_active || hovered { 1.0 } else { 0.0 };
    let current = state.expand_t.get();
    let speed = if target > current {
        EXPAND_SPEED
    } else {
        COLLAPSE_SPEED
    };
    let new_t = (current + (target - current) * speed).clamp(0.0, 1.0);
    let snapped = if (new_t - target).abs() < 0.005 {
        target
    } else {
        new_t
    };
    state.expand_t.set(snapped);

    state.phase_time.set(state.phase_time.get() + 0.016);

    if phase == Phase::Loading {
        state
            .loading_offset
            .set(state.loading_offset.get() + 0.02);
    }
}

fn update_input_region(da: &gtk4::DrawingArea, expand_t: f64) {
    let Some(native) = da.native() else { return };
    let Some(surface) = native.surface() else {
        return;
    };

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

    cr.set_operator(cairo::Operator::Source);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.0);
    let _ = cr.paint();
    cr.set_operator(cairo::Operator::Over);

    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let opacity = lerp(IDLE_OPACITY, ACTIVE_OPACITY, expand_t);

    let rx = (w - pill_w) / 2.0;
    let ry = (h - pill_h) / 2.0;
    let radius = pill_h / 2.0;

    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.set_source_rgba(0.1, 0.1, 0.12, opacity);
    let _ = cr.fill();

    match state.phase.get() {
        Phase::Recording if expand_t > 0.1 => {
            draw_waveform(cr, rx, ry, pill_w, pill_h, expand_t, state);
        }
        Phase::Loading if expand_t > 0.1 => {
            draw_loading(cr, rx, ry, pill_w, pill_h, expand_t, state);
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
    let time = state.phase_time.get();
    let level = state.smoothed_level.get();

    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, pill_h / 2.0);
    cr.clip();

    let center_y = ry + pill_h / 2.0;
    let amp_base = pill_h * 0.25 * expand_t;

    for layer in 0..WAVEFORM_LAYERS {
        let layer_f = layer as f64;
        let alpha = (0.9 - layer_f * 0.25) * expand_t;
        let freq = 3.0 + layer_f * 1.5;
        let phase_offset = layer_f * 0.8;
        let amplitude = amp_base * (0.3 + level * 0.7) * (1.0 - layer_f * 0.2);

        cr.set_source_rgba(1.0, 1.0, 1.0, alpha);
        cr.set_line_width(1.5 - layer_f * 0.3);

        let steps = pill_w as i32;
        for i in 0..=steps {
            let x = rx + i as f64;
            let t_norm = i as f64 / pill_w;

            let edge_fade = (t_norm * 4.0).min(1.0) * ((1.0 - t_norm) * 4.0).min(1.0);
            let y_offset =
                (t_norm * freq * PI * 2.0 + time * 4.0 + phase_offset).sin() * amplitude
                    * edge_fade;

            if i == 0 {
                cr.move_to(x, center_y + y_offset);
            } else {
                cr.line_to(x, center_y + y_offset);
            }
        }
        let _ = cr.stroke();
    }

    cr.restore().ok();
}

fn draw_loading(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    expand_t: f64,
    state: &PillState,
) {
    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, pill_h / 2.0);
    cr.clip();

    let progress_width = pill_w * 0.4;
    let offset = state.loading_offset.get() % 1.0;
    let bar_x = rx + (pill_w + progress_width) * offset - progress_width;

    let alpha = 0.5 * expand_t;
    let gradient = cairo::LinearGradient::new(bar_x, 0.0, bar_x + progress_width, 0.0);
    gradient.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 0.0);
    gradient.add_color_stop_rgba(0.5, 1.0, 1.0, 1.0, alpha);
    gradient.add_color_stop_rgba(1.0, 1.0, 1.0, 1.0, 0.0);
    cr.set_source(&gradient).ok();
    cr.rectangle(bar_x, ry, progress_width, pill_h);
    let _ = cr.fill();

    cr.restore().ok();
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
