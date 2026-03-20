use gtk::cairo;
use gtk::gdk;
use gtk::glib::{self, ControlFlow};
use gtk::prelude::*;
use gtk_layer_shell::LayerShell;
use std::cell::Cell;
use std::f64::consts::PI;
use std::rc::Rc;
use std::time::Duration;
use tauri::Manager;

use crate::domain::OverlayPhase;
use crate::overlay::{EXPANDED_PILL_HEIGHT, EXPANDED_PILL_WIDTH, MIN_PILL_HEIGHT, MIN_PILL_WIDTH};

const WINDOW_WIDTH: i32 = 120;
const WINDOW_HEIGHT: i32 = 32;
const MARGIN_BOTTOM: i32 = 8;

const IDLE_OPACITY: f64 = 0.6;
const ACTIVE_OPACITY: f64 = 1.0;

const EXPAND_SPEED: f64 = 0.12;
const COLLAPSE_SPEED: f64 = 0.08;

const WAVEFORM_LAYERS: usize = 3;
const WAVEFORM_SMOOTHING: f64 = 0.15;

struct AnimState {
    expand_t: Cell<f64>,
    phase_time: Cell<f64>,
    smoothed_level: Cell<f64>,
    hovered: Cell<bool>,
    loading_offset: Cell<f64>,
}

pub fn create_pill_overlay(app: &tauri::AppHandle) -> bool {
    if !gtk_layer_shell::is_supported() {
        return false;
    }

    let window = gtk::Window::new(gtk::WindowType::Toplevel);
    window.set_app_paintable(true);

    if let Some(screen) = WidgetExt::screen(&window) {
        if let Some(visual) = screen.rgba_visual() {
            window.set_visual(Some(&visual));
        }
    }

    window.set_default_size(WINDOW_WIDTH, WINDOW_HEIGHT);

    window.init_layer_shell();
    window.set_layer(gtk_layer_shell::Layer::Overlay);
    window.set_anchor(gtk_layer_shell::Edge::Bottom, true);
    window.set_layer_shell_margin(gtk_layer_shell::Edge::Bottom, MARGIN_BOTTOM);
    window.set_keyboard_mode(gtk_layer_shell::KeyboardMode::None);
    window.set_exclusive_zone(-1);
    window.set_namespace("voquill-pill");

    let drawing_area = gtk::DrawingArea::new();
    window.add(&drawing_area);

    window.add_events(
        gdk::EventMask::ENTER_NOTIFY_MASK
            | gdk::EventMask::LEAVE_NOTIFY_MASK
            | gdk::EventMask::POINTER_MOTION_MASK,
    );

    let anim = Rc::new(AnimState {
        expand_t: Cell::new(0.0),
        phase_time: Cell::new(0.0),
        smoothed_level: Cell::new(0.0),
        hovered: Cell::new(false),
        loading_offset: Cell::new(0.0),
    });

    let anim_enter = anim.clone();
    window.connect_enter_notify_event(move |_, _| {
        anim_enter.hovered.set(true);
        glib::Propagation::Proceed
    });

    let anim_leave = anim.clone();
    window.connect_leave_notify_event(move |_, _| {
        anim_leave.hovered.set(false);
        glib::Propagation::Proceed
    });

    let app_handle = app.clone();
    let anim_draw = anim.clone();
    drawing_area.connect_draw(move |_widget, cr| {
        let overlay_state = app_handle.state::<crate::state::OverlayState>();
        let phase = overlay_state.get_phase();
        let t = anim_draw.expand_t.get();

        draw_pill(cr, &phase, t, &anim_draw);

        glib::Propagation::Proceed
    });

    window.show_all();

    update_input_region(&window, 0.0);

    let app_state = app.clone();
    let anim_loop = anim.clone();
    let window_for_loop = window.clone();
    glib::timeout_add_local(Duration::from_millis(16), move || {
        let overlay_state = app_state.state::<crate::state::OverlayState>();
        let phase = overlay_state.get_phase();
        let is_active = phase != OverlayPhase::Idle;
        let hovered = anim_loop.hovered.get();

        let levels = overlay_state.take_audio_levels();
        let raw_level = if levels.is_empty() {
            0.0
        } else {
            levels.iter().copied().fold(0.0_f32, f32::max) as f64
        };
        let prev = anim_loop.smoothed_level.get();
        let smoothed = prev + (raw_level - prev) * WAVEFORM_SMOOTHING;
        anim_loop.smoothed_level.set(smoothed);

        let target = if is_active || hovered { 1.0 } else { 0.0 };
        let current = anim_loop.expand_t.get();
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
        anim_loop.expand_t.set(snapped);

        anim_loop
            .phase_time
            .set(anim_loop.phase_time.get() + 0.016);

        if phase == OverlayPhase::Loading {
            anim_loop
                .loading_offset
                .set(anim_loop.loading_offset.get() + 0.02);
        }

        update_input_region(&window_for_loop, snapped);

        drawing_area.queue_draw();
        ControlFlow::Continue
    });

    true
}

pub fn start_pill_overlay_loop(_app: tauri::AppHandle) {
    // The render loop is already started in create_pill_overlay via glib::timeout_add_local.
}

fn update_input_region(window: &gtk::Window, expand_t: f64) {
    let Some(gdk_window) = window.window() else {
        return;
    };

    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);

    let rx = ((WINDOW_WIDTH as f64 - pill_w) / 2.0) as i32;
    let ry = ((WINDOW_HEIGHT as f64 - pill_h) / 2.0) as i32;

    let rect = cairo::RectangleInt::new(rx, ry, pill_w as i32, pill_h as i32);
    let region = cairo::Region::create_rectangle(&rect);

    gdk_window.input_shape_combine_region(&region, 0, 0);
}

fn draw_pill(cr: &cairo::Context, phase: &OverlayPhase, expand_t: f64, anim: &AnimState) {
    let w = WINDOW_WIDTH as f64;
    let h = WINDOW_HEIGHT as f64;

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

    match phase {
        OverlayPhase::Recording => {
            if expand_t > 0.1 {
                draw_waveform(cr, rx, ry, pill_w, pill_h, expand_t, anim);
            }
        }
        OverlayPhase::Loading => {
            if expand_t > 0.1 {
                draw_loading(cr, rx, ry, pill_w, pill_h, expand_t, anim);
            }
        }
        OverlayPhase::Idle => {}
    }
}

fn draw_waveform(
    cr: &cairo::Context,
    rx: f64,
    ry: f64,
    pill_w: f64,
    pill_h: f64,
    expand_t: f64,
    anim: &AnimState,
) {
    let time = anim.phase_time.get();
    let level = anim.smoothed_level.get();

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
    anim: &AnimState,
) {
    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, pill_h / 2.0);
    cr.clip();

    let progress_width = pill_w * 0.4;
    let offset = anim.loading_offset.get() % 1.0;
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
