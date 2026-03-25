use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::sync::mpsc::Receiver;
use std::time::Duration;

use gtk::gdk;
use gtk::glib::{self, ControlFlow};
use gtk::prelude::*;
use gtk_layer_shell::LayerShell;

use crate::constants::*;
use crate::ipc::{self, InMessage, OutMessage, Phase, Visibility};
use crate::state::{PillState, WindowMode};
use crate::{draw, input, x11};

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
        window.connect_realize(move |window| x11::setup_x11_window(window, x11_ui_scale));
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

    let overlay_widget = gtk::Overlay::new();
    let drawing_area = gtk::DrawingArea::new();
    drawing_area.set_size_request(scaled_width, scaled_height);
    overlay_widget.add(&drawing_area);

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
        viewport_height: Cell::new(0.0),
        should_stick: Cell::new(true),
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
            input::set_expanded_input_region(&gdk_win, &state_enter);
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
        input::handle_click(&state_click, x, y);
        glib::Propagation::Proceed
    });

    let state_scroll = state.clone();
    window.connect_scroll_event(move |_, event| {
        input::handle_scroll(&state_scroll, event);
        glib::Propagation::Proceed
    });

    let state_draw = state.clone();
    drawing_area.connect_draw(move |_area, cr| {
        draw::draw_all(cr, &state_draw);
        glib::Propagation::Proceed
    });

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
                    let was_active = state_tick.assistant_active.get();
                    state_tick.assistant_active.set(active);
                    *state_tick.assistant_input_mode.borrow_mut() = input_mode;
                    state_tick.assistant_compact.set(compact);
                    *state_tick.assistant_conversation_id.borrow_mut() = conversation_id;
                    *state_tick.assistant_user_prompt.borrow_mut() = user_prompt;
                    *state_tick.assistant_messages.borrow_mut() = messages;
                    *state_tick.assistant_streaming.borrow_mut() = streaming;
                    *state_tick.assistant_permissions.borrow_mut() = permissions;

                    if active && !was_active {
                        state_tick.should_stick.set(true);
                        state_tick.scroll_offset.set(0.0);
                    }
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
            let panel_w = PANEL_EXPANDED_WIDTH;
            let ww = state_tick.window_width.get() as f64;
            let panel_x = (ww - panel_w) / 2.0;
            let margin_start = ((panel_x + PANEL_CONTENT_SIDE_INSET) * ui_scale) as i32;
            let margin_end = ((ww - panel_x - panel_w + PANEL_CONTENT_SIDE_INSET) * ui_scale) as i32;
            let margin_bottom = (PANEL_BOTTOM_MARGIN * ui_scale) as i32;
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
            input::update_input_region(&gdk_win, &state_tick);
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

    // Auto-scroll to bottom when new content arrives
    if state.should_stick.get() && state.assistant_active.get() && !state.assistant_compact.get() {
        let max_scroll = (state.content_height.get() - state.viewport_height.get()).max(0.0);
        state.scroll_offset.set(max_scroll);
    }
}
