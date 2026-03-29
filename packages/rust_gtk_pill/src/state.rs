use std::cell::{Cell, RefCell};

use crate::ipc::{Phase, PillMessage, PillPermission, PillStreaming, Visibility};

use crate::constants::*;

#[derive(Debug, Clone)]
pub(crate) enum ClickAction {
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
pub(crate) struct ClickRegion {
    pub(crate) x: f64,
    pub(crate) y: f64,
    pub(crate) w: f64,
    pub(crate) h: f64,
    pub(crate) action: ClickAction,
}

impl ClickRegion {
    pub(crate) fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.w && py >= self.y && py <= self.y + self.h
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum WindowMode {
    Dictation,
    AssistantCompact,
    AssistantExpanded,
    AssistantTyping,
}

impl WindowMode {
    pub(crate) fn from_str(s: &str) -> Self {
        match s {
            "assistant_compact" => Self::AssistantCompact,
            "assistant_expanded" => Self::AssistantExpanded,
            "assistant_typing" => Self::AssistantTyping,
            _ => Self::Dictation,
        }
    }

    pub(crate) fn dimensions(&self) -> (i32, i32) {
        match self {
            Self::Dictation => (DICTATION_WINDOW_WIDTH, DICTATION_WINDOW_HEIGHT),
            Self::AssistantCompact => (WINDOW_W_COMPACT, WINDOW_H_COMPACT),
            Self::AssistantExpanded => (WINDOW_W_EXPANDED, WINDOW_H_EXPANDED),
            Self::AssistantTyping => (WINDOW_W_TYPING, WINDOW_H_TYPING),
        }
    }
}

pub(crate) struct PillState {
    pub(crate) phase: Cell<Phase>,
    pub(crate) visibility: Cell<Visibility>,
    pub(crate) expand_t: Cell<f64>,
    pub(crate) expand_velocity: Cell<f64>,
    pub(crate) hovered: Cell<bool>,
    pub(crate) wave_phase: Cell<f64>,
    pub(crate) current_level: Cell<f64>,
    pub(crate) target_level: Cell<f64>,
    pub(crate) loading_offset: Cell<f64>,
    pub(crate) pending_levels: RefCell<Vec<f32>>,
    pub(crate) style_count: Cell<u32>,
    pub(crate) style_name: RefCell<String>,
    pub(crate) tooltip_t: Cell<f64>,
    pub(crate) tooltip_velocity: Cell<f64>,
    pub(crate) tooltip_width: Cell<f64>,
    pub(crate) ui_scale: f64,

    // Window sizing
    pub(crate) window_mode: Cell<WindowMode>,
    pub(crate) draw_width: Cell<f64>,
    pub(crate) draw_height: Cell<f64>,
    pub(crate) draw_w_velocity: Cell<f64>,
    pub(crate) draw_h_velocity: Cell<f64>,

    // Assistant state
    pub(crate) assistant_active: Cell<bool>,
    pub(crate) assistant_input_mode: RefCell<String>,
    pub(crate) assistant_compact: Cell<bool>,
    pub(crate) assistant_conversation_id: RefCell<Option<String>>,
    pub(crate) assistant_user_prompt: RefCell<Option<String>>,
    pub(crate) assistant_messages: RefCell<Vec<PillMessage>>,
    pub(crate) assistant_streaming: RefCell<Option<PillStreaming>>,
    pub(crate) assistant_permissions: RefCell<Vec<PillPermission>>,

    // Assistant UI animation
    pub(crate) panel_open_t: Cell<f64>,
    pub(crate) panel_open_velocity: Cell<f64>,
    pub(crate) kb_button_t: Cell<f64>,
    pub(crate) kb_button_velocity: Cell<f64>,
    pub(crate) shimmer_phase: Cell<f64>,

    // Scroll
    pub(crate) scroll_offset: Cell<f64>,
    pub(crate) content_height: Cell<f64>,
    pub(crate) viewport_height: Cell<f64>,
    pub(crate) should_stick: Cell<bool>,

    // Click regions (rebuilt each frame)
    pub(crate) click_regions: RefCell<Vec<ClickRegion>>,

    // Entry text (for typing mode)
    pub(crate) entry_text: RefCell<String>,

    // Effective visibility (avoids Wayland surface hide/show issues)
    pub(crate) pill_visible: Cell<bool>,
}

impl PillState {
    pub(crate) fn content_offset(&self) -> (f64, f64) {
        let dw = self.draw_width.get();
        let dh = self.draw_height.get();
        ((WINDOW_W_TYPING as f64 - dw) / 2.0, WINDOW_H_TYPING as f64 - dh)
    }
}
