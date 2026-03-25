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

use crate::ipc::{self, InMessage, OutMessage, Phase, PillMessage, PillPermission, PillStreaming, Visibility};

const TAU: f64 = PI * 2.0;

// ── Dictation pill layout ──────────────────────────────────────────
const DICTATION_WINDOW_WIDTH: i32 = 200;
const DICTATION_WINDOW_HEIGHT: i32 = 72;
const MARGIN_BOTTOM: i32 = 8;

const PILL_AREA_HEIGHT: f64 = 48.0;

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

// ── Tooltip (style selector) ──────────────────────────────────────
const TOOLTIP_HEIGHT: f64 = 24.0;
const TOOLTIP_GAP: f64 = 6.0;
const TOOLTIP_RADIUS: f64 = 8.0;
const TOOLTIP_EXPAND_SPEED: f64 = 0.15;
const TOOLTIP_COLLAPSE_SPEED: f64 = 0.12;

// ── Waveform — ported from AudioWaveform.tsx ──────────────────────
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

// ── Loading — MUI LinearProgress indeterminate ────────────────────
const LOADING_BAR_WIDTH_FRAC: f64 = 0.4;
const LOADING_SPEED: f64 = 0.015;

// ── Assistant panel — matching AssistantModePanel.tsx ──────────────
const PANEL_COMPACT_WIDTH: f64 = 424.0;
const PANEL_COMPACT_HEIGHT: f64 = 120.0;
const PANEL_EXPANDED_WIDTH: f64 = 572.0;
const PANEL_EXPANDED_HEIGHT: f64 = 258.0;
const PANEL_TYPING_HEIGHT: f64 = 338.0;
const PANEL_RADIUS: f64 = 24.0;
const PANEL_BG_ALPHA: f64 = 0.96;
const PANEL_BORDER_ALPHA: f64 = 0.12;
const PANEL_INPUT_HEIGHT: f64 = 48.0;
const PANEL_HEADER_OFFSET_TOP: f64 = 10.0;
const PANEL_HEADER_OFFSET_LEFT: f64 = 10.0;
const PANEL_HEADER_OFFSET_RIGHT: f64 = 24.0;
const PANEL_CONTENT_SIDE_INSET: f64 = 24.0;
const PANEL_TRANSCRIPT_TOP_OFFSET: f64 = 56.0;
const HEADER_BUTTON_SIZE: f64 = 28.0;
const PANEL_PILL_GAP: f64 = 8.0;
const PANEL_OPEN_SPEED: f64 = 0.14;
const PANEL_CLOSE_SPEED: f64 = 0.10;

// Keyboard button (to the right of pill in assistant voice mode)
const KB_BUTTON_SIZE: f64 = 32.0;
const KB_BUTTON_GAP: f64 = 8.0;
const KB_BUTTON_SPEED: f64 = 0.14;

// Cancel button (top-right of pill in dictation mode)
const CANCEL_BUTTON_SIZE: f64 = 18.0;

// Permission card
const PERM_CARD_HEIGHT: f64 = 68.0;
const PERM_BUTTON_WIDTH: f64 = 80.0;
const PERM_BUTTON_HEIGHT: f64 = 26.0;
const PERM_BUTTON_GAP: f64 = 6.0;

// ── Window sizes for each mode ────────────────────────────────────
const WINDOW_W_COMPACT: i32 = 452;
const WINDOW_H_COMPACT: i32 = 206;
const WINDOW_W_EXPANDED: i32 = 620;
const WINDOW_H_EXPANDED: i32 = 350;
const WINDOW_W_TYPING: i32 = 600;
const WINDOW_H_TYPING: i32 = 408;

// ── Thinking shimmer ──────────────────────────────────────────────
const SHIMMER_SPEED: f64 = 0.01;

// ── Click regions ─────────────────────────────────────────────────
#[derive(Debug, Clone)]
enum ClickAction {
    Pill,
    StyleForward,
    StyleBackward,
    AssistantClose,
    OpenInNew,
    KeyboardButton,
    CancelDictation,
    PermissionAllow(String),
    PermissionDeny(String),
    PermissionAlwaysAllow(String),
    SendButton,
}

#[derive(Debug, Clone)]
struct ClickRegion {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    action: ClickAction,
}

impl ClickRegion {
    fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.w && py >= self.y && py <= self.y + self.h
    }
}

// ── Pill window size mode ─────────────────────────────────────────
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WindowMode {
    Dictation,
    AssistantCompact,
    AssistantExpanded,
    AssistantTyping,
}

impl WindowMode {
    fn from_str(s: &str) -> Self {
        match s {
            "assistant_compact" => Self::AssistantCompact,
            "assistant_expanded" => Self::AssistantExpanded,
            "assistant_typing" => Self::AssistantTyping,
            _ => Self::Dictation,
        }
    }

    fn dimensions(&self) -> (i32, i32) {
        match self {
            Self::Dictation => (DICTATION_WINDOW_WIDTH, DICTATION_WINDOW_HEIGHT),
            Self::AssistantCompact => (WINDOW_W_COMPACT, WINDOW_H_COMPACT),
            Self::AssistantExpanded => (WINDOW_W_EXPANDED, WINDOW_H_EXPANDED),
            Self::AssistantTyping => (WINDOW_W_TYPING, WINDOW_H_TYPING),
        }
    }

    #[allow(dead_code)]
    fn is_assistant(&self) -> bool {
        !matches!(self, Self::Dictation)
    }
}

// ── State ─────────────────────────────────────────────────────────
struct PillState {
    phase: Cell<Phase>,
    visibility: Cell<Visibility>,
    expand_t: Cell<f64>,
    hovered: Cell<bool>,
    wave_phase: Cell<f64>,
    current_level: Cell<f64>,
    target_level: Cell<f64>,
    loading_offset: Cell<f64>,
    pending_levels: RefCell<Vec<f32>>,
    style_count: Cell<u32>,
    style_name: RefCell<String>,
    tooltip_t: Cell<f64>,
    tooltip_width: Cell<f64>,
    ui_scale: f64,

    // Window sizing
    window_mode: Cell<WindowMode>,
    window_width: Cell<i32>,
    window_height: Cell<i32>,

    // Assistant state
    assistant_active: Cell<bool>,
    assistant_input_mode: RefCell<String>,
    assistant_compact: Cell<bool>,
    assistant_conversation_id: RefCell<Option<String>>,
    assistant_user_prompt: RefCell<Option<String>>,
    assistant_messages: RefCell<Vec<PillMessage>>,
    assistant_streaming: RefCell<Option<PillStreaming>>,
    assistant_permissions: RefCell<Vec<PillPermission>>,

    // Assistant UI animation
    panel_open_t: Cell<f64>,
    kb_button_t: Cell<f64>,
    shimmer_phase: Cell<f64>,

    // Scroll
    scroll_offset: Cell<f64>,
    content_height: Cell<f64>,

    // Click regions (rebuilt each frame)
    click_regions: RefCell<Vec<ClickRegion>>,

    // Entry text (for typing mode)
    entry_text: RefCell<String>,
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

    let ui_scale = if !use_layer_shell {
        let dpi = gdk::Screen::default().map(|s| s.resolution()).unwrap_or(-1.0);
        let gdk_scale = std::env::var("GDK_SCALE")
            .ok()
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(1.0);
        if dpi > 96.0 {
            (dpi / 96.0 / gdk_scale).max(1.0)
        } else {
            1.0
        }
    } else {
        1.0
    };

    let scaled_width = (DICTATION_WINDOW_WIDTH as f64 * ui_scale).ceil() as i32;
    let scaled_height = (DICTATION_WINDOW_HEIGHT as f64 * ui_scale).ceil() as i32;
    let scaled_margin = (MARGIN_BOTTOM as f64 * ui_scale).ceil() as i32;

    let window = gtk::Window::new(gtk::WindowType::Toplevel);
    window.set_default_size(scaled_width, scaled_height);
    window.set_decorated(false);
    window.set_app_paintable(true);

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
        window.set_layer_shell_margin(gtk_layer_shell::Edge::Bottom, scaled_margin);
        window.set_keyboard_mode(gtk_layer_shell::KeyboardMode::None);
        window.set_exclusive_zone(0);
        window.set_namespace("voquill-pill");
    } else {
        let x11_ui_scale = ui_scale;
        window.connect_realize(move |window| setup_x11_window(window, x11_ui_scale));
    }

    let css = gtk::CssProvider::new();
    let _ = css.load_from_data(
        b"window { background: transparent; }
          entry { background: transparent; border: none; color: rgba(255,255,255,0.92); }
          entry:focus { box-shadow: none; outline: none; }",
    );
    if let Some(screen) = gdk::Screen::default() {
        gtk::StyleContext::add_provider_for_screen(
            &screen,
            &css,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
    }

    // Use an overlay widget so we can stack the entry on top of the drawing area
    let overlay_widget = gtk::Overlay::new();
    let drawing_area = gtk::DrawingArea::new();
    drawing_area.set_size_request(scaled_width, scaled_height);
    overlay_widget.add(&drawing_area);

    // Text entry for typing mode
    let entry = gtk::Entry::new();
    entry.set_placeholder_text(Some("Type a message..."));
    entry.set_has_frame(false);
    entry.set_halign(gtk::Align::Fill);
    entry.set_valign(gtk::Align::End);
    entry.set_visible(false);
    entry.set_no_show_all(true);
    overlay_widget.add_overlay(&entry);

    window.add(&overlay_widget);

    let state = Rc::new(PillState {
        phase: Cell::new(Phase::Idle),
        visibility: Cell::new(Visibility::WhileActive),
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
        ui_scale,
        window_mode: Cell::new(WindowMode::Dictation),
        window_width: Cell::new(DICTATION_WINDOW_WIDTH),
        window_height: Cell::new(DICTATION_WINDOW_HEIGHT),
        assistant_active: Cell::new(false),
        assistant_input_mode: RefCell::new("voice".to_string()),
        assistant_compact: Cell::new(true),
        assistant_conversation_id: RefCell::new(None),
        assistant_user_prompt: RefCell::new(None),
        assistant_messages: RefCell::new(Vec::new()),
        assistant_streaming: RefCell::new(None),
        assistant_permissions: RefCell::new(Vec::new()),
        panel_open_t: Cell::new(0.0),
        kb_button_t: Cell::new(0.0),
        shimmer_phase: Cell::new(0.0),
        scroll_offset: Cell::new(0.0),
        content_height: Cell::new(0.0),
        click_regions: RefCell::new(Vec::new()),
        entry_text: RefCell::new(String::new()),
    });

    window.add_events(
        gdk::EventMask::ENTER_NOTIFY_MASK
            | gdk::EventMask::LEAVE_NOTIFY_MASK
            | gdk::EventMask::BUTTON_RELEASE_MASK
            | gdk::EventMask::SCROLL_MASK
            | gdk::EventMask::SMOOTH_SCROLL_MASK,
    );

    let state_enter = state.clone();
    window.connect_enter_notify_event(move |win, _| {
        state_enter.hovered.set(true);
        ipc::send(&OutMessage::Hover { hovered: true });
        if let Some(gdk_win) = win.window() {
            set_expanded_input_region(&gdk_win, &state_enter);
        }
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

    let state_scroll = state.clone();
    window.connect_scroll_event(move |_, event| {
        handle_scroll(&state_scroll, event);
        glib::Propagation::Proceed
    });

    let state_draw = state.clone();
    drawing_area.connect_draw(move |_area, cr| {
        draw_all(cr, &state_draw);
        glib::Propagation::Proceed
    });

    // Entry activate (Enter key) → send typed message
    let state_entry = state.clone();
    entry.connect_activate(move |e| {
        let text = e.text().to_string();
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            ipc::send(&OutMessage::TypedMessage { text: trimmed.to_string() });
            e.set_text("");
            *state_entry.entry_text.borrow_mut() = String::new();
        }
    });

    let state_entry_changed = state.clone();
    entry.connect_changed(move |e| {
        *state_entry_changed.entry_text.borrow_mut() = e.text().to_string();
    });

    let receiver = Rc::new(RefCell::new(receiver));
    let state_tick = state.clone();
    let da = drawing_area.clone();
    let win_tick = window.clone();
    let entry_tick = entry.clone();
    let quit_flag = Rc::new(Cell::new(false));
    let quit_tick = quit_flag.clone();
    let use_ls = use_layer_shell;
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
                InMessage::Visibility { visibility } => {
                    state_tick.visibility.set(visibility);
                }
                InMessage::WindowSize { ref size } => {
                    let mode = WindowMode::from_str(size);
                    state_tick.window_mode.set(mode);
                }
                InMessage::AssistantState {
                    active,
                    input_mode,
                    compact,
                    conversation_id,
                    user_prompt,
                    messages,
                    streaming,
                    permissions,
                } => {
                    state_tick.assistant_active.set(active);
                    *state_tick.assistant_input_mode.borrow_mut() = input_mode;
                    state_tick.assistant_compact.set(compact);
                    *state_tick.assistant_conversation_id.borrow_mut() = conversation_id;
                    *state_tick.assistant_user_prompt.borrow_mut() = user_prompt;
                    *state_tick.assistant_messages.borrow_mut() = messages;
                    *state_tick.assistant_streaming.borrow_mut() = streaming;
                    *state_tick.assistant_permissions.borrow_mut() = permissions;
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

        // Window resize
        let mode = state_tick.window_mode.get();
        let (tw, th) = mode.dimensions();
        let cw = state_tick.window_width.get();
        let ch = state_tick.window_height.get();
        if tw != cw || th != ch {
            state_tick.window_width.set(tw);
            state_tick.window_height.set(th);
            let sw = (tw as f64 * ui_scale).ceil() as i32;
            let sh = (th as f64 * ui_scale).ceil() as i32;
            win_tick.resize(sw, sh);
            da.set_size_request(sw, sh);
        }

        // Show/hide entry for typing mode
        let is_typing = state_tick.assistant_active.get()
            && *state_tick.assistant_input_mode.borrow() == "type";
        if is_typing && !gtk::prelude::WidgetExt::is_visible(&entry_tick) {
            // Position entry at bottom of panel
            let panel_w = PANEL_EXPANDED_WIDTH;
            let ww = state_tick.window_width.get() as f64;
            let panel_x = (ww - panel_w) / 2.0;
            let margin_start = ((panel_x + PANEL_CONTENT_SIDE_INSET) * ui_scale) as i32;
            let margin_end = ((ww - panel_x - panel_w + PANEL_CONTENT_SIDE_INSET) * ui_scale) as i32;
            let margin_bottom = ((PILL_AREA_HEIGHT + PANEL_PILL_GAP) * ui_scale) as i32;
            entry_tick.set_margin_start(margin_start);
            entry_tick.set_margin_end(margin_end);
            entry_tick.set_margin_bottom(margin_bottom);
            entry_tick.set_height_request((PANEL_INPUT_HEIGHT * ui_scale) as i32);
            entry_tick.set_visible(true);
            entry_tick.show();
            if use_ls {
                win_tick.set_keyboard_mode(gtk_layer_shell::KeyboardMode::OnDemand);
            }
            glib::idle_add_local_once({
                let e = entry_tick.clone();
                move || { e.grab_focus(); }
            });
        } else if !is_typing && gtk::prelude::WidgetExt::is_visible(&entry_tick) {
            entry_tick.set_visible(false);
            entry_tick.hide();
            if use_ls {
                win_tick.set_keyboard_mode(gtk_layer_shell::KeyboardMode::None);
            }
        }

        let visibility = state_tick.visibility.get();
        let is_active = state_tick.phase.get() != Phase::Idle;
        let is_assistant = state_tick.assistant_active.get();
        let should_show = match visibility {
            Visibility::Hidden => is_assistant,
            Visibility::WhileActive => is_active || is_assistant,
            Visibility::Persistent => true,
        };
        if should_show {
            win_tick.show();
        } else {
            win_tick.hide();
        }

        if let Some(gdk_win) = win_tick.window() {
            update_input_region(&gdk_win, &state_tick);
        }
        da.queue_draw();
        ControlFlow::Continue
    });

    window.show_all();
    entry.hide();
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

// ── Tick / animation ──────────────────────────────────────────────

fn tick(state: &PillState) {
    let phase = state.phase.get();
    let is_active = phase != Phase::Idle;
    let is_recording = phase == Phase::Recording;
    let is_loading = phase == Phase::Loading;
    let hovered = state.hovered.get();

    // Audio levels
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

    let current = state.current_level.get();
    let target = state.target_level.get();
    let new_current = current + (target - current) * LEVEL_SMOOTHING;
    state.current_level.set(if new_current < 0.0002 { 0.0 } else { new_current });

    let decayed = target * TARGET_DECAY_PER_FRAME;
    state.target_level.set(if decayed < 0.0005 { 0.0 } else { decayed });

    let level = state.current_level.get();
    let base_level = if is_loading && !is_recording { PROCESSING_BASE_LEVEL } else { 0.0 };
    let effective_level = level.max(base_level);
    let advance = WAVE_BASE_PHASE_STEP + WAVE_PHASE_GAIN * effective_level;
    state.wave_phase.set((state.wave_phase.get() + advance) % TAU);

    // Pill expand/collapse
    let expand_target = if is_active || hovered || state.assistant_active.get() { 1.0 } else { 0.0 };
    let expand_current = state.expand_t.get();
    let speed = if expand_target > expand_current { EXPAND_SPEED } else { COLLAPSE_SPEED };
    let new_t = (expand_current + (expand_target - expand_current) * speed).clamp(0.0, 1.0);
    let snapped = if (new_t - expand_target).abs() < 0.005 { expand_target } else { new_t };
    state.expand_t.set(snapped);

    // Loading offset
    if is_loading {
        state.loading_offset.set((state.loading_offset.get() + LOADING_SPEED) % 1.0);
    }

    // Tooltip animation (only in dictation mode)
    let show_tooltip = !state.assistant_active.get()
        && state.style_count.get() > 1
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

    // Panel open/close animation
    let panel_target = if state.assistant_active.get() { 1.0 } else { 0.0 };
    let panel_current = state.panel_open_t.get();
    let panel_speed = if panel_target > panel_current { PANEL_OPEN_SPEED } else { PANEL_CLOSE_SPEED };
    let new_pt = (panel_current + (panel_target - panel_current) * panel_speed).clamp(0.0, 1.0);
    let snapped_pt = if (new_pt - panel_target).abs() < 0.005 { panel_target } else { new_pt };
    state.panel_open_t.set(snapped_pt);

    // Keyboard button animation
    let is_voice = *state.assistant_input_mode.borrow() == "voice";
    let kb_target = if state.assistant_active.get() && is_voice { 1.0 } else { 0.0 };
    let kb_current = state.kb_button_t.get();
    let kb_speed = KB_BUTTON_SPEED;
    let new_kb = (kb_current + (kb_target - kb_current) * kb_speed).clamp(0.0, 1.0);
    let snapped_kb = if (new_kb - kb_target).abs() < 0.005 { kb_target } else { new_kb };
    state.kb_button_t.set(snapped_kb);

    // Shimmer phase for thinking animation
    state.shimmer_phase.set((state.shimmer_phase.get() + SHIMMER_SPEED) % 1.0);
}

// ── Drawing ───────────────────────────────────────────────────────

fn draw_all(cr: &cairo::Context, state: &PillState) {
    cr.set_operator(cairo::Operator::Source);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.0);
    let _ = cr.paint();
    cr.set_operator(cairo::Operator::Over);

    let s = state.ui_scale;
    if s != 1.0 {
        cr.scale(s, s);
    }

    state.click_regions.borrow_mut().clear();

    let ww = state.window_width.get() as f64;
    let wh = state.window_height.get() as f64;

    if state.assistant_active.get() || state.panel_open_t.get() > 0.01 {
        draw_assistant_panel(cr, state, ww, wh);
    } else {
        // Dictation mode: tooltip above, pill at bottom
        let pill_area_top = wh - PILL_AREA_HEIGHT;
        draw_tooltip(cr, state, ww, pill_area_top);
    }

    draw_pill(cr, state, ww, wh);

    if state.assistant_active.get() {
        draw_keyboard_button(cr, state, ww, wh);
    }

    if !state.assistant_active.get() {
        draw_cancel_button(cr, state, ww, wh);
    }
}

fn pill_position(state: &PillState, ww: f64, wh: f64) -> (f64, f64, f64, f64) {
    let expand_t = state.expand_t.get();
    let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
    let pill_x = (ww - pill_w) / 2.0;

    let pill_y = if state.assistant_active.get() || state.panel_open_t.get() > 0.01 {
        wh - PILL_AREA_HEIGHT + (PILL_AREA_HEIGHT - pill_h) / 2.0
    } else {
        // Dictation mode: pill in bottom area
        let pill_area_top = wh - PILL_AREA_HEIGHT;
        pill_area_top + (EXPANDED_PILL_HEIGHT - pill_h) / 2.0 + (PILL_AREA_HEIGHT - EXPANDED_PILL_HEIGHT) / 2.0
    };

    (pill_x, pill_y, pill_w, pill_h)
}

fn draw_pill(cr: &cairo::Context, state: &PillState, ww: f64, wh: f64) {
    let expand_t = state.expand_t.get();
    let (rx, ry, pill_w, pill_h) = pill_position(state, ww, wh);

    let bg_alpha = lerp(IDLE_BG_ALPHA, ACTIVE_BG_ALPHA, expand_t);
    let radius = lerp(COLLAPSED_RADIUS, EXPANDED_RADIUS, expand_t);

    // Hide pill in typing mode
    let is_typing = state.assistant_active.get()
        && *state.assistant_input_mode.borrow() == "type";
    if is_typing {
        return;
    }

    // Background fill
    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.set_source_rgba(0.0, 0.0, 0.0, bg_alpha);
    let _ = cr.fill();

    // Border
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
        Phase::Idle if expand_t > 0.5 && state.hovered.get() && !state.assistant_active.get() => {
            draw_idle_label(cr, rx, ry, pill_w, pill_h, expand_t);
        }
        _ => {}
    }

    // Add pill click region
    state.click_regions.borrow_mut().push(ClickRegion {
        x: rx, y: ry, w: pill_w, h: pill_h,
        action: if state.assistant_active.get() { ClickAction::Pill } else { ClickAction::Pill },
    });
}

fn draw_waveform(
    cr: &cairo::Context, rx: f64, ry: f64, pill_w: f64, pill_h: f64,
    expand_t: f64, state: &PillState,
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
    cr: &cairo::Context, rx: f64, ry: f64, pill_w: f64, pill_h: f64,
    radius: f64, expand_t: f64,
) {
    cr.save().ok();
    rounded_rect(cr, rx, ry, pill_w, pill_h, radius);
    cr.clip();

    let alpha = 0.9 * expand_t;

    let left_grad = cairo::LinearGradient::new(rx, 0.0, rx + pill_w * 0.18, 0.0);
    left_grad.add_color_stop_rgba(0.0, 0.0, 0.0, 0.0, alpha);
    left_grad.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.0);
    cr.set_source(&left_grad).ok();
    cr.rectangle(rx, ry, pill_w * 0.18, pill_h);
    let _ = cr.fill();

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
    cr: &cairo::Context, rx: f64, ry: f64, pill_w: f64, pill_h: f64,
    radius: f64, expand_t: f64, state: &PillState,
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

fn draw_idle_label(cr: &cairo::Context, rx: f64, ry: f64, pill_w: f64, pill_h: f64, expand_t: f64) {
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

// ── Tooltip (dictation style selector) ────────────────────────────

fn draw_tooltip(cr: &cairo::Context, state: &PillState, ww: f64, pill_area_top: f64) {
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

    let tooltip_rx = (ww - tooltip_w) / 2.0;
    let y_offset = (1.0 - tooltip_t) * 4.0;
    let tooltip_ry = pill_area_top - TOOLTIP_GAP - TOOLTIP_HEIGHT + y_offset;
    let alpha = tooltip_t;

    rounded_rect(cr, tooltip_rx, tooltip_ry, tooltip_w, TOOLTIP_HEIGHT, TOOLTIP_RADIUS);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.92 * alpha);
    let _ = cr.fill();

    rounded_rect(cr, tooltip_rx + 0.5, tooltip_ry + 0.5, tooltip_w - 1.0, TOOLTIP_HEIGHT - 1.0, TOOLTIP_RADIUS - 0.5);
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

    // Style name text
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.9 * alpha);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Bold);
    cr.set_font_size(11.0);
    let text_area_left = tooltip_rx + padding_h + chevron_area;
    let text_area_right = tooltip_rx + tooltip_w - padding_h - chevron_area;
    let text_area_center = (text_area_left + text_area_right) / 2.0;
    let tx = text_area_center - text_extents.width() / 2.0 - text_extents.x_bearing();
    let ty = center_y - text_extents.height() / 2.0 - text_extents.y_bearing();

    cr.save().ok();
    cr.rectangle(text_area_left, tooltip_ry, text_area_right - text_area_left, TOOLTIP_HEIGHT);
    cr.clip();
    cr.move_to(tx, ty);
    let _ = cr.show_text(&style_name);
    cr.restore().ok();

    // Click regions for tooltip
    let mid_x = tooltip_rx + tooltip_w / 2.0;
    state.click_regions.borrow_mut().push(ClickRegion {
        x: tooltip_rx, y: tooltip_ry, w: mid_x - tooltip_rx, h: TOOLTIP_HEIGHT,
        action: ClickAction::StyleBackward,
    });
    state.click_regions.borrow_mut().push(ClickRegion {
        x: mid_x, y: tooltip_ry, w: tooltip_rx + tooltip_w - mid_x, h: TOOLTIP_HEIGHT,
        action: ClickAction::StyleForward,
    });
}

// ── Assistant panel ───────────────────────────────────────────────

fn draw_assistant_panel(cr: &cairo::Context, state: &PillState, ww: f64, wh: f64) {
    let panel_t = state.panel_open_t.get();
    if panel_t < 0.01 {
        return;
    }

    let is_compact = state.assistant_compact.get();
    let is_typing = *state.assistant_input_mode.borrow() == "type";

    let target_panel_w = if is_compact { PANEL_COMPACT_WIDTH } else { PANEL_EXPANDED_WIDTH };
    let target_panel_h = if is_compact {
        PANEL_COMPACT_HEIGHT
    } else if is_typing {
        PANEL_TYPING_HEIGHT
    } else {
        PANEL_EXPANDED_HEIGHT
    };

    let panel_w = target_panel_w;
    let panel_h = target_panel_h;
    let panel_x = (ww - panel_w) / 2.0;
    let pill_area_top = wh - PILL_AREA_HEIGHT;
    let panel_y = pill_area_top - PANEL_PILL_GAP - panel_h;

    // Animate entrance
    let alpha = panel_t;
    let y_shift = (1.0 - panel_t) * 12.0;

    // Panel background
    cr.save().ok();
    rounded_rect(cr, panel_x, panel_y + y_shift, panel_w, panel_h, PANEL_RADIUS);
    cr.set_source_rgba(0.0, 0.0, 0.0, PANEL_BG_ALPHA * alpha);
    let _ = cr.fill();

    // Panel border
    rounded_rect(cr, panel_x + 0.5, panel_y + y_shift + 0.5, panel_w - 1.0, panel_h - 1.0, PANEL_RADIUS - 0.5);
    cr.set_source_rgba(1.0, 1.0, 1.0, PANEL_BORDER_ALPHA * alpha);
    cr.set_line_width(1.0);
    let _ = cr.stroke();
    cr.restore().ok();

    let py = panel_y + y_shift;

    // Close button (top-left)
    draw_panel_button(cr, state, panel_x + PANEL_HEADER_OFFSET_LEFT, py + PANEL_HEADER_OFFSET_TOP,
        HEADER_BUTTON_SIZE, alpha, ButtonIcon::Close);
    state.click_regions.borrow_mut().push(ClickRegion {
        x: panel_x + PANEL_HEADER_OFFSET_LEFT,
        y: py + PANEL_HEADER_OFFSET_TOP,
        w: HEADER_BUTTON_SIZE, h: HEADER_BUTTON_SIZE,
        action: ClickAction::AssistantClose,
    });

    // Open in new window button (next to close, only when not compact)
    if !is_compact {
        let open_x = panel_x + PANEL_HEADER_OFFSET_LEFT + HEADER_BUTTON_SIZE + 4.0;
        draw_panel_button(cr, state, open_x, py + PANEL_HEADER_OFFSET_TOP,
            HEADER_BUTTON_SIZE, alpha, ButtonIcon::OpenInNew);
        state.click_regions.borrow_mut().push(ClickRegion {
            x: open_x, y: py + PANEL_HEADER_OFFSET_TOP,
            w: HEADER_BUTTON_SIZE, h: HEADER_BUTTON_SIZE,
            action: ClickAction::OpenInNew,
        });

        // User prompt preview (top-right)
        if let Some(ref prompt) = *state.assistant_user_prompt.borrow() {
            draw_user_prompt_preview(cr, panel_x, py, panel_w, prompt, alpha);
        }
    }

    if is_compact {
        draw_compact_content(cr, panel_x, py, panel_w, panel_h, alpha, state);
    } else {
        // Clip to panel interior for transcript
        cr.save().ok();
        rounded_rect(cr, panel_x, py, panel_w, panel_h, PANEL_RADIUS);
        cr.clip();

        let content_x = panel_x + PANEL_CONTENT_SIDE_INSET;
        let content_w = panel_w - PANEL_CONTENT_SIDE_INSET * 2.0;
        let content_top = py + PANEL_TRANSCRIPT_TOP_OFFSET;
        let content_bottom = if is_typing {
            py + panel_h - PANEL_INPUT_HEIGHT
        } else {
            py + panel_h - 24.0
        };
        let content_h = content_bottom - content_top;

        draw_transcript(cr, state, content_x, content_top, content_w, content_h, alpha);

        // Top gradient fade
        let grad_h = PANEL_TRANSCRIPT_TOP_OFFSET + 16.0;
        let top_grad = cairo::LinearGradient::new(0.0, py, 0.0, py + grad_h);
        top_grad.add_color_stop_rgba(0.0, 0.0, 0.0, 0.0, 0.98 * alpha);
        top_grad.add_color_stop_rgba(0.38, 0.0, 0.0, 0.0, 0.82 * alpha);
        top_grad.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.0);
        cr.set_source(&top_grad).ok();
        cr.rectangle(panel_x, py, panel_w, grad_h);
        let _ = cr.fill();

        // Bottom gradient fade
        let bot_grad_h = 48.0;
        let bot_y = content_bottom - bot_grad_h;
        let bot_grad = cairo::LinearGradient::new(0.0, bot_y, 0.0, content_bottom);
        bot_grad.add_color_stop_rgba(0.0, 0.0, 0.0, 0.0, 0.0);
        bot_grad.add_color_stop_rgba(0.62, 0.0, 0.0, 0.0, 0.82 * alpha);
        bot_grad.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.98 * alpha);
        cr.set_source(&bot_grad).ok();
        cr.rectangle(panel_x, bot_y, panel_w, bot_grad_h);
        let _ = cr.fill();

        cr.restore().ok();

        // Input area border (typing mode) — drawn by entry widget, just draw separator
        if is_typing {
            let input_y = py + panel_h - PANEL_INPUT_HEIGHT;
            cr.set_source_rgba(1.0, 1.0, 1.0, 0.1 * alpha);
            cr.set_line_width(1.0);
            cr.move_to(panel_x + PANEL_CONTENT_SIDE_INSET, input_y);
            cr.line_to(panel_x + panel_w - PANEL_CONTENT_SIDE_INSET, input_y);
            let _ = cr.stroke();

            // Send button
            let send_btn_size = 28.0;
            let send_x = panel_x + panel_w - PANEL_CONTENT_SIDE_INSET - send_btn_size;
            let send_y = input_y + (PANEL_INPUT_HEIGHT - send_btn_size) / 2.0;
            let has_text = !state.entry_text.borrow().trim().is_empty();
            let text_alpha = if has_text { 0.82 } else { 0.2 };

            // Send arrow icon
            cr.set_source_rgba(1.0, 1.0, 1.0, text_alpha * alpha);
            let cx = send_x + send_btn_size / 2.0;
            let cy = send_y + send_btn_size / 2.0;
            // Simple arrow icon
            cr.set_line_width(1.5);
            cr.set_line_cap(cairo::LineCap::Round);
            cr.set_line_join(cairo::LineJoin::Round);
            cr.move_to(cx - 5.0, cy + 5.0);
            cr.line_to(cx + 5.0, cy);
            cr.line_to(cx - 5.0, cy - 5.0);
            let _ = cr.stroke();
            cr.move_to(cx - 5.0, cy);
            cr.line_to(cx + 5.0, cy);
            let _ = cr.stroke();

            if has_text {
                state.click_regions.borrow_mut().push(ClickRegion {
                    x: send_x, y: send_y, w: send_btn_size, h: send_btn_size,
                    action: ClickAction::SendButton,
                });
            }
        }
    }
}

fn draw_compact_content(
    cr: &cairo::Context, panel_x: f64, panel_y: f64, panel_w: f64,
    _panel_h: f64, alpha: f64, state: &PillState,
) {
    let text = "What can I help you with?";
    let text_alpha = if state.phase.get() == Phase::Recording { 0.96 } else { 0.8 };
    cr.set_source_rgba(1.0, 1.0, 1.0, text_alpha * alpha);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
    cr.set_font_size(18.0);
    let extents = cr.text_extents(text).unwrap();
    let tx = panel_x + (panel_w - extents.width()) / 2.0 - extents.x_bearing();
    let ty = panel_y + 26.0 + 18.0; // paddingTop ~3.25 spacing + font size
    cr.move_to(tx, ty);
    let _ = cr.show_text(text);
}

fn draw_transcript(
    cr: &cairo::Context, state: &PillState,
    area_x: f64, area_y: f64, area_w: f64, area_h: f64, alpha: f64,
) {
    let messages = state.assistant_messages.borrow();
    let streaming = state.assistant_streaming.borrow();
    let permissions = state.assistant_permissions.borrow();

    if messages.is_empty() && permissions.is_empty() {
        return;
    }

    cr.save().ok();
    cr.rectangle(area_x, area_y, area_w, area_h);
    cr.clip();

    let scroll = state.scroll_offset.get();
    let mut y = area_y - scroll;

    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
    cr.set_font_size(14.0);

    let line_height = 20.0;

    for (i, msg) in messages.iter().enumerate() {
        // Divider between messages
        if i > 0 {
            y += 16.0;
            cr.set_source_rgba(1.0, 1.0, 1.0, 0.45 * alpha);
            cr.set_line_width(1.0);
            cr.move_to(area_x, y);
            cr.line_to(area_x + 36.0, y);
            let _ = cr.stroke();
            y += 8.0;
        }

        // Streaming activity for this message
        if let Some(ref stream) = *streaming {
            if stream.message_id == msg.id {
                y = draw_streaming_activity(cr, stream, area_x, y, area_w, alpha);
            }
        }

        if msg.is_tool_result {
            // Tool result: icon + description
            let tool_desc = msg.tool_description.as_deref()
                .or(msg.tool_name.as_deref())
                .unwrap_or("Tool");
            let reason = msg.reason.as_deref().unwrap_or("");
            let display = if reason.is_empty() {
                tool_desc.to_string()
            } else {
                format!("{tool_desc} — {reason}")
            };

            cr.set_source_rgba(1.0, 1.0, 1.0, 0.5 * alpha);
            cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
            cr.set_font_size(12.0);

            // Wrench icon (simple)
            draw_wrench_icon(cr, area_x, y + 2.0, 12.0, 0.5 * alpha);
            let text_x = area_x + 18.0;
            cr.move_to(text_x, y + 12.0);
            let _ = cr.show_text(&display);
            y += 18.0;
        } else if let Some(ref content) = msg.content {
            // Text content
            let color_alpha = if msg.is_error { 0.94 } else { 0.92 };
            let (r, g, b) = if msg.is_error { (1.0, 0.4, 0.4) } else { (1.0, 1.0, 1.0) };

            cr.set_source_rgba(r, g, b, color_alpha * alpha);
            cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
            cr.set_font_size(14.0);

            let lines = wrap_text(cr, content, area_w);
            for line in &lines {
                cr.move_to(area_x, y + line_height * 0.75);
                let _ = cr.show_text(line);
                y += line_height;
            }
        } else {
            // Empty content = thinking
            y = draw_thinking_text(cr, area_x, y, alpha, state);
        }
    }

    // Permission cards
    for perm in permissions.iter() {
        y += 12.0;
        y = draw_permission_card(cr, state, perm, area_x, y, area_w, alpha);
    }

    // Update content height for scrolling
    let total_height = y + scroll - area_y;
    state.content_height.set(total_height);

    cr.restore().ok();
}

fn draw_streaming_activity(
    cr: &cairo::Context, streaming: &PillStreaming,
    x: f64, mut y: f64, _w: f64, alpha: f64,
) -> f64 {
    cr.select_font_face("sans-serif", cairo::FontSlant::Italic, cairo::FontWeight::Normal);
    cr.set_font_size(12.0);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.5 * alpha);

    for tc in &streaming.tool_calls {
        let text = if tc.done {
            format!("Used {}", tc.name)
        } else {
            format!("Using {}…", tc.name)
        };
        cr.move_to(x, y + 12.0);
        let _ = cr.show_text(&text);
        y += 16.0;
    }

    if !streaming.reasoning.is_empty() {
        let label = if streaming.is_streaming { "Thinking…" } else { "Thought process" };
        cr.move_to(x, y + 12.0);
        let _ = cr.show_text(label);
        y += 16.0;
    }

    y
}

fn draw_thinking_text(
    cr: &cairo::Context, x: f64, y: f64, alpha: f64, state: &PillState,
) -> f64 {
    let text = "Thinking";
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
    cr.set_font_size(14.0);
    let extents = cr.text_extents(text).unwrap();

    // Shimmer effect: gradient that moves across the text
    let shimmer = state.shimmer_phase.get();
    let text_y = y + 14.0;

    cr.save().ok();
    cr.rectangle(x, y, extents.width() + 4.0, 20.0);
    cr.clip();

    let grad_offset = shimmer * extents.width() * 4.0 - extents.width();
    let gradient = cairo::LinearGradient::new(x + grad_offset, 0.0, x + grad_offset + extents.width() * 2.0, 0.0);
    gradient.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 0.34 * alpha);
    gradient.add_color_stop_rgba(0.5, 1.0, 1.0, 1.0, 0.92 * alpha);
    gradient.add_color_stop_rgba(1.0, 1.0, 1.0, 1.0, 0.34 * alpha);
    cr.set_source(&gradient).ok();
    cr.move_to(x, text_y);
    let _ = cr.show_text(text);

    cr.restore().ok();
    y + 20.0
}

fn draw_permission_card(
    cr: &cairo::Context, state: &PillState, perm: &PillPermission,
    x: f64, y: f64, w: f64, alpha: f64,
) -> f64 {
    let card_h = PERM_CARD_HEIGHT;

    // Card background
    rounded_rect(cr, x, y, w, card_h, 12.0);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.06 * alpha);
    let _ = cr.fill();

    rounded_rect(cr, x + 0.5, y + 0.5, w - 1.0, card_h - 1.0, 11.5);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.12 * alpha);
    cr.set_line_width(1.0);
    let _ = cr.stroke();

    // Tool name
    let tool_label = perm.description.as_deref().unwrap_or(&perm.tool_name);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.82 * alpha);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Bold);
    cr.set_font_size(12.0);
    cr.move_to(x + 12.0, y + 18.0);
    let _ = cr.show_text(tool_label);

    // Reason
    if let Some(ref reason) = perm.reason {
        cr.set_source_rgba(1.0, 1.0, 1.0, 0.5 * alpha);
        cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
        cr.set_font_size(11.0);
        cr.move_to(x + 12.0, y + 32.0);
        let _ = cr.show_text(reason);
    }

    // Buttons: Deny | Allow | Always Allow
    let btn_y = y + card_h - PERM_BUTTON_HEIGHT - 8.0;
    let btn_labels = [("Deny", 0.5), ("Allow", 0.82), ("Always Allow", 0.82)];
    let mut btn_x = x + w - 12.0;

    for (i, (label, text_alpha)) in btn_labels.iter().rev().enumerate() {
        let btn_w = if i == 0 { PERM_BUTTON_WIDTH + 16.0 } else { PERM_BUTTON_WIDTH };
        btn_x -= btn_w;

        rounded_rect(cr, btn_x, btn_y, btn_w, PERM_BUTTON_HEIGHT, 6.0);
        cr.set_source_rgba(1.0, 1.0, 1.0, 0.08 * alpha);
        let _ = cr.fill();

        rounded_rect(cr, btn_x + 0.5, btn_y + 0.5, btn_w - 1.0, PERM_BUTTON_HEIGHT - 1.0, 5.5);
        cr.set_source_rgba(1.0, 1.0, 1.0, 0.15 * alpha);
        cr.set_line_width(1.0);
        let _ = cr.stroke();

        cr.set_source_rgba(1.0, 1.0, 1.0, text_alpha * alpha);
        cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
        cr.set_font_size(11.0);
        let ext = cr.text_extents(label).unwrap();
        cr.move_to(btn_x + (btn_w - ext.width()) / 2.0 - ext.x_bearing(), btn_y + (PERM_BUTTON_HEIGHT - ext.height()) / 2.0 - ext.y_bearing());
        let _ = cr.show_text(label);

        let action = match 2 - i {
            0 => ClickAction::PermissionDeny(perm.id.clone()),
            1 => ClickAction::PermissionAllow(perm.id.clone()),
            _ => ClickAction::PermissionAlwaysAllow(perm.id.clone()),
        };
        state.click_regions.borrow_mut().push(ClickRegion {
            x: btn_x, y: btn_y, w: btn_w, h: PERM_BUTTON_HEIGHT, action,
        });

        btn_x -= PERM_BUTTON_GAP;
    }

    y + card_h
}

fn draw_user_prompt_preview(
    cr: &cairo::Context, panel_x: f64, panel_y: f64, panel_w: f64,
    prompt: &str, alpha: f64,
) {
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.5 * alpha);
    cr.select_font_face("sans-serif", cairo::FontSlant::Normal, cairo::FontWeight::Normal);
    cr.set_font_size(14.0);

    // Truncate to fit
    let max_w = panel_w * 0.5;
    let mut display = prompt.to_string();
    loop {
        let ext = cr.text_extents(&display).unwrap();
        if ext.width() <= max_w || display.len() < 4 {
            break;
        }
        display.truncate(display.len() - 4);
        display.push_str("…");
    }

    let ext = cr.text_extents(&display).unwrap();
    let tx = panel_x + panel_w - PANEL_HEADER_OFFSET_RIGHT - ext.width() - ext.x_bearing();
    let ty = panel_y + PANEL_HEADER_OFFSET_TOP + HEADER_BUTTON_SIZE / 2.0 - ext.height() / 2.0 - ext.y_bearing();
    cr.move_to(tx, ty);
    let _ = cr.show_text(&display);
}

#[derive(Debug, Clone, Copy)]
enum ButtonIcon {
    Close,
    OpenInNew,
}

fn draw_panel_button(
    cr: &cairo::Context, _state: &PillState,
    x: f64, y: f64, size: f64, alpha: f64, icon: ButtonIcon,
) {
    // Button background
    rounded_rect(cr, x, y, size, size, size / 4.0);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.06 * alpha);
    let _ = cr.fill();

    let cx = x + size / 2.0;
    let cy = y + size / 2.0;
    let icon_size = 7.0;

    cr.set_source_rgba(1.0, 1.0, 1.0, 0.82 * alpha);
    cr.set_line_width(1.5);
    cr.set_line_cap(cairo::LineCap::Round);

    match icon {
        ButtonIcon::Close => {
            cr.move_to(cx - icon_size / 2.0, cy - icon_size / 2.0);
            cr.line_to(cx + icon_size / 2.0, cy + icon_size / 2.0);
            let _ = cr.stroke();
            cr.move_to(cx + icon_size / 2.0, cy - icon_size / 2.0);
            cr.line_to(cx - icon_size / 2.0, cy + icon_size / 2.0);
            let _ = cr.stroke();
        }
        ButtonIcon::OpenInNew => {
            // Simple open-in-new: arrow pointing top-right from a box corner
            let s = icon_size * 0.5;
            cr.move_to(cx - s, cy + s);
            cr.line_to(cx + s, cy - s);
            let _ = cr.stroke();
            cr.move_to(cx, cy - s);
            cr.line_to(cx + s, cy - s);
            cr.line_to(cx + s, cy);
            let _ = cr.stroke();
            // Small box corner
            cr.move_to(cx - s, cy - s * 0.3);
            cr.line_to(cx - s, cy + s);
            cr.line_to(cx + s * 0.3, cy + s);
            let _ = cr.stroke();
        }
    }
}

fn draw_keyboard_button(cr: &cairo::Context, state: &PillState, ww: f64, wh: f64) {
    let kb_t = state.kb_button_t.get();
    if kb_t < 0.01 {
        return;
    }

    let (_, pill_y, _, _) = pill_position(state, ww, wh);
    let pill_center_x = ww / 2.0;

    let target_x = pill_center_x + EXPANDED_PILL_WIDTH / 2.0 + KB_BUTTON_GAP;
    let hidden_x = pill_center_x - KB_BUTTON_SIZE / 2.0;
    let btn_x = lerp(hidden_x, target_x, kb_t);
    let btn_y = pill_y + (EXPANDED_PILL_HEIGHT - KB_BUTTON_SIZE) / 2.0;
    let scale = lerp(0.5, 1.0, kb_t);
    let alpha = kb_t;

    cr.save().ok();
    cr.translate(btn_x + KB_BUTTON_SIZE / 2.0, btn_y + KB_BUTTON_SIZE / 2.0);
    cr.scale(scale, scale);
    cr.translate(-(KB_BUTTON_SIZE / 2.0), -(KB_BUTTON_SIZE / 2.0));

    // Circle background
    cr.arc(KB_BUTTON_SIZE / 2.0, KB_BUTTON_SIZE / 2.0, KB_BUTTON_SIZE / 2.0, 0.0, TAU);
    cr.set_source_rgba(0.0, 0.0, 0.0, 0.92 * alpha);
    let _ = cr.fill();

    // Border
    cr.arc(KB_BUTTON_SIZE / 2.0, KB_BUTTON_SIZE / 2.0, KB_BUTTON_SIZE / 2.0 - 0.5, 0.0, TAU);
    cr.set_source_rgba(1.0, 1.0, 1.0, BORDER_ALPHA * alpha);
    cr.set_line_width(1.0);
    let _ = cr.stroke();

    // Keyboard icon (simplified)
    let cx = KB_BUTTON_SIZE / 2.0;
    let cy = KB_BUTTON_SIZE / 2.0;
    let kw = 12.0;
    let kh = 8.0;
    let kx = cx - kw / 2.0;
    let ky = cy - kh / 2.0;

    rounded_rect(cr, kx, ky, kw, kh, 1.5);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.7 * alpha);
    cr.set_line_width(1.0);
    let _ = cr.stroke();

    // Key dots
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.7 * alpha);
    for row in 0..2 {
        let dots = if row == 0 { 3 } else { 2 };
        let row_y = ky + 2.5 + row as f64 * 3.5;
        let total_w = (dots - 1) as f64 * 3.0;
        let start_x = cx - total_w / 2.0;
        for d in 0..dots {
            let dx = start_x + d as f64 * 3.0;
            cr.rectangle(dx - 0.5, row_y - 0.5, 1.0, 1.0);
            let _ = cr.fill();
        }
    }

    cr.restore().ok();

    // Click region (in unscaled coordinates)
    if kb_t > 0.5 {
        state.click_regions.borrow_mut().push(ClickRegion {
            x: btn_x, y: btn_y, w: KB_BUTTON_SIZE, h: KB_BUTTON_SIZE,
            action: ClickAction::KeyboardButton,
        });
    }
}

fn draw_cancel_button(cr: &cairo::Context, state: &PillState, ww: f64, wh: f64) {
    let is_idle = state.phase.get() == Phase::Idle;
    let hovered = state.hovered.get();

    if is_idle || !hovered || state.assistant_active.get() {
        return;
    }

    let (pill_x, pill_y, pill_w, _) = pill_position(state, ww, wh);
    let btn_x = pill_x + pill_w - CANCEL_BUTTON_SIZE / 2.0 + 2.0;
    let btn_y = pill_y - CANCEL_BUTTON_SIZE / 2.0 - 2.0;

    // Background circle
    cr.arc(
        btn_x + CANCEL_BUTTON_SIZE / 2.0,
        btn_y + CANCEL_BUTTON_SIZE / 2.0,
        CANCEL_BUTTON_SIZE / 2.0,
        0.0, TAU,
    );
    cr.set_source_rgba(0.46, 0.46, 0.46, 1.0); // grey[600] ≈ #757575
    let _ = cr.fill();

    // X icon
    let cx = btn_x + CANCEL_BUTTON_SIZE / 2.0;
    let cy = btn_y + CANCEL_BUTTON_SIZE / 2.0;
    let s = 3.5;
    cr.set_source_rgba(1.0, 1.0, 1.0, 1.0);
    cr.set_line_width(1.5);
    cr.set_line_cap(cairo::LineCap::Round);
    cr.move_to(cx - s, cy - s);
    cr.line_to(cx + s, cy + s);
    let _ = cr.stroke();
    cr.move_to(cx + s, cy - s);
    cr.line_to(cx - s, cy + s);
    let _ = cr.stroke();

    state.click_regions.borrow_mut().push(ClickRegion {
        x: btn_x, y: btn_y, w: CANCEL_BUTTON_SIZE, h: CANCEL_BUTTON_SIZE,
        action: ClickAction::CancelDictation,
    });
}

fn draw_wrench_icon(cr: &cairo::Context, x: f64, y: f64, size: f64, alpha: f64) {
    cr.set_source_rgba(1.0, 1.0, 1.0, alpha);
    cr.set_line_width(1.0);
    cr.set_line_cap(cairo::LineCap::Round);
    let cx = x + size / 2.0;
    let cy = y + size / 2.0;
    let r = size * 0.35;
    cr.arc(cx, cy, r, 0.0, TAU);
    let _ = cr.stroke();
    cr.move_to(cx + r * 0.7, cy + r * 0.7);
    cr.line_to(cx + size * 0.4, cy + size * 0.4);
    let _ = cr.stroke();
}

// ── Click handling ────────────────────────────────────────────────

fn handle_click(state: &PillState, x: f64, y: f64) {
    let s = state.ui_scale;
    let x = x / s;
    let y = y / s;

    let regions = state.click_regions.borrow();
    // Check regions in reverse order (topmost drawn last)
    for region in regions.iter().rev() {
        if region.contains(x, y) {
            match &region.action {
                ClickAction::Pill => {
                    if state.assistant_active.get() {
                        ipc::send(&OutMessage::AgentTalk);
                    } else {
                        ipc::send(&OutMessage::Click);
                    }
                }
                ClickAction::StyleForward => {
                    ipc::send(&OutMessage::StyleSwitch { direction: "forward".to_string() });
                }
                ClickAction::StyleBackward => {
                    ipc::send(&OutMessage::StyleSwitch { direction: "backward".to_string() });
                }
                ClickAction::AssistantClose => {
                    ipc::send(&OutMessage::AssistantClose);
                }
                ClickAction::OpenInNew => {
                    if let Some(ref id) = *state.assistant_conversation_id.borrow() {
                        ipc::send(&OutMessage::OpenConversation { conversation_id: id.clone() });
                    }
                    ipc::send(&OutMessage::AssistantClose);
                }
                ClickAction::KeyboardButton => {
                    ipc::send(&OutMessage::EnableTypeMode);
                }
                ClickAction::CancelDictation => {
                    ipc::send(&OutMessage::CancelDictation);
                }
                ClickAction::PermissionAllow(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "allowed".to_string(), always_allow: false,
                    });
                }
                ClickAction::PermissionDeny(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "denied".to_string(), always_allow: false,
                    });
                }
                ClickAction::PermissionAlwaysAllow(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "allowed".to_string(), always_allow: true,
                    });
                }
                ClickAction::SendButton => {
                    let text = state.entry_text.borrow().trim().to_string();
                    if !text.is_empty() {
                        ipc::send(&OutMessage::TypedMessage { text });
                        *state.entry_text.borrow_mut() = String::new();
                    }
                }
            }
            return;
        }
    }
}

fn handle_scroll(state: &PillState, event: &gdk::EventScroll) {
    if !state.assistant_active.get() || state.assistant_compact.get() {
        return;
    }

    let dy = match event.direction() {
        gdk::ScrollDirection::Up => -30.0,
        gdk::ScrollDirection::Down => 30.0,
        gdk::ScrollDirection::Smooth => {
            let (_, dy) = event.delta();
            dy * 30.0
        }
        _ => 0.0,
    };

    let current = state.scroll_offset.get();
    let max_scroll = (state.content_height.get() - 100.0).max(0.0);
    state.scroll_offset.set((current + dy).clamp(0.0, max_scroll));
}

// ── Input region ──────────────────────────────────────────────────

fn set_expanded_input_region(gdk_window: &gdk::Window, state: &PillState) {
    let s = state.ui_scale;
    let ww = state.window_width.get() as f64;
    let wh = state.window_height.get() as f64;

    if state.assistant_active.get() {
        // Entire window is interactive in assistant mode
        let rect = cairo::RectangleInt::new(0, 0, (ww * s).ceil() as i32, (wh * s).ceil() as i32);
        let region = cairo::Region::create_rectangle(&rect);
        gdk_window.input_shape_combine_region(&region, 0, 0);
    } else {
        // Dictation mode: expanded pill bounds
        let pill_w = EXPANDED_PILL_WIDTH;
        let pill_h = EXPANDED_PILL_HEIGHT;
        let pill_rx = ((ww - pill_w) / 2.0 * s) as i32;
        let pill_area_top = wh - PILL_AREA_HEIGHT;
        let pill_ry = (pill_area_top * s) as i32;

        let tooltip_t = state.tooltip_t.get();
        let tooltip_w = state.tooltip_width.get();

        if tooltip_t > 0.1 && tooltip_w > 0.0 {
            let tooltip_top = ((pill_area_top - TOOLTIP_GAP - TOOLTIP_HEIGHT) * s) as i32;
            let region_w = ((tooltip_w.ceil().max(pill_w)) * s).ceil() as i32;
            let region_rx = ((ww - region_w as f64 / s) / 2.0 * s) as i32;
            let region_h = pill_ry + (pill_h * s).ceil() as i32 + ((PILL_AREA_HEIGHT - EXPANDED_PILL_HEIGHT) / 2.0 * s).ceil() as i32 - tooltip_top;
            let rect = cairo::RectangleInt::new(region_rx, tooltip_top, region_w, region_h);
            let region = cairo::Region::create_rectangle(&rect);
            gdk_window.input_shape_combine_region(&region, 0, 0);
        } else {
            let rect = cairo::RectangleInt::new(
                pill_rx, pill_ry,
                (pill_w * s).ceil() as i32,
                ((PILL_AREA_HEIGHT) * s).ceil() as i32,
            );
            let region = cairo::Region::create_rectangle(&rect);
            gdk_window.input_shape_combine_region(&region, 0, 0);
        }
    }
}

fn update_input_region(gdk_window: &gdk::Window, state: &PillState) {
    let hovered = state.hovered.get();
    let is_active = state.phase.get() != Phase::Idle;
    let is_assistant = state.assistant_active.get();

    if is_assistant {
        set_expanded_input_region(gdk_window, state);
    } else if hovered || is_active {
        set_expanded_input_region(gdk_window, state);
    } else {
        let s = state.ui_scale;
        let ww = state.window_width.get() as f64;
        let wh = state.window_height.get() as f64;
        let expand_t = state.expand_t.get();
        let pill_w = lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
        let pill_h = lerp(MIN_PILL_HEIGHT, EXPANDED_PILL_HEIGHT, expand_t);
        let pill_rx = ((ww - pill_w) / 2.0 * s) as i32;
        let pill_area_top = wh - PILL_AREA_HEIGHT;
        let pill_ry = ((pill_area_top + (EXPANDED_PILL_HEIGHT - pill_h) / 2.0 + (PILL_AREA_HEIGHT - EXPANDED_PILL_HEIGHT) / 2.0) * s) as i32;
        let rect = cairo::RectangleInt::new(
            pill_rx, pill_ry,
            (pill_w * s).ceil() as i32,
            (pill_h * s).ceil() as i32,
        );
        let region = cairo::Region::create_rectangle(&rect);
        gdk_window.input_shape_combine_region(&region, 0, 0);
    }
}

// ── Text wrapping ─────────────────────────────────────────────────

fn wrap_text(cr: &cairo::Context, text: &str, max_width: f64) -> Vec<String> {
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        let words: Vec<&str> = paragraph.split_whitespace().collect();
        if words.is_empty() {
            lines.push(String::new());
            continue;
        }
        let mut current_line = String::new();
        for word in words {
            let test = if current_line.is_empty() {
                word.to_string()
            } else {
                format!("{} {}", current_line, word)
            };
            if let Ok(extents) = cr.text_extents(&test) {
                if extents.width() > max_width && !current_line.is_empty() {
                    lines.push(current_line);
                    current_line = word.to_string();
                } else {
                    current_line = test;
                }
            } else {
                current_line = test;
            }
        }
        if !current_line.is_empty() {
            lines.push(current_line);
        }
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}

// ── Utility ───────────────────────────────────────────────────────

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

// ── X11 window setup ──────────────────────────────────────────────

fn setup_x11_window(window: &gtk::Window, ui_scale: f64) {
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

    let win_ref = window.clone();
    let pill_pos_on_monitor =
        move |cx: c_int, cy: c_int, disp: &gdk::Display| -> Option<(c_int, c_int)> {
            let n = disp.n_monitors();
            for i in 0..n {
                let monitor = disp.monitor(i)?;
                let g = monitor.geometry();
                let scale = monitor.scale_factor() as f64;
                let phys_x = g.x() as f64 * scale;
                let phys_y = g.y() as f64 * scale;
                let phys_w = g.width() as f64 * scale;
                let phys_h = g.height() as f64 * scale;
                if (cx as f64) >= phys_x && (cx as f64) < phys_x + phys_w
                    && (cy as f64) >= phys_y && (cy as f64) < phys_y + phys_h
                {
                    let wa = monitor.workarea();
                    let wa_x = wa.x() as f64 * scale;
                    let wa_y = wa.y() as f64 * scale;
                    let wa_w = wa.width() as f64 * scale;
                    let wa_h = wa.height() as f64 * scale;
                    let (alloc_w, alloc_h) = win_ref.size();
                    let win_w = alloc_w as f64;
                    let win_h = alloc_h as f64;
                    let margin = MARGIN_BOTTOM as f64 * ui_scale * scale;
                    return Some((
                        (wa_x + (wa_w - win_w) / 2.0) as c_int,
                        (wa_y + wa_h - win_h - margin) as c_int,
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
