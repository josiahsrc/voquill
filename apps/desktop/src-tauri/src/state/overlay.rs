use std::sync::atomic::{AtomicU8, Ordering};

use crate::domain::{OverlayPhase, PillWindowSize};

const PHASE_IDLE: u8 = 0;
const PHASE_RECORDING: u8 = 1;
const PHASE_LOADING: u8 = 2;

const SIZE_DICTATION: u8 = 0;
const SIZE_ASSISTANT_COMPACT: u8 = 1;
const SIZE_ASSISTANT_EXPANDED: u8 = 2;
const SIZE_ASSISTANT_TYPING: u8 = 3;

pub struct OverlayState {
    phase: AtomicU8,
    pill_hover_enabled: AtomicU8,
    pill_window_size: AtomicU8,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self::new()
    }
}

impl OverlayState {
    pub fn new() -> Self {
        Self {
            phase: AtomicU8::new(PHASE_IDLE),
            pill_hover_enabled: AtomicU8::new(0),
            pill_window_size: AtomicU8::new(SIZE_DICTATION),
        }
    }

    pub fn set_phase(&self, phase: &OverlayPhase) {
        let value = match phase {
            OverlayPhase::Idle => PHASE_IDLE,
            OverlayPhase::Recording => PHASE_RECORDING,
            OverlayPhase::Loading => PHASE_LOADING,
        };
        self.phase.store(value, Ordering::Relaxed);
    }

    pub fn get_phase(&self) -> OverlayPhase {
        match self.phase.load(Ordering::Relaxed) {
            PHASE_RECORDING => OverlayPhase::Recording,
            PHASE_LOADING => OverlayPhase::Loading,
            _ => OverlayPhase::Idle,
        }
    }

    pub fn is_idle(&self) -> bool {
        self.phase.load(Ordering::Relaxed) == PHASE_IDLE
    }

    pub fn set_pill_hover_enabled(&self, enabled: bool) {
        self.pill_hover_enabled
            .store(if enabled { 1 } else { 0 }, Ordering::Relaxed);
    }

    pub fn is_pill_hover_enabled(&self) -> bool {
        self.pill_hover_enabled.load(Ordering::Relaxed) != 0
    }

    pub fn set_pill_window_size(&self, size: PillWindowSize) {
        let value = match size {
            PillWindowSize::Dictation => SIZE_DICTATION,
            PillWindowSize::AssistantCompact => SIZE_ASSISTANT_COMPACT,
            PillWindowSize::AssistantExpanded => SIZE_ASSISTANT_EXPANDED,
            PillWindowSize::AssistantTyping => SIZE_ASSISTANT_TYPING,
        };
        self.pill_window_size.store(value, Ordering::Relaxed);
    }

    pub fn get_pill_window_size(&self) -> PillWindowSize {
        match self.pill_window_size.load(Ordering::Relaxed) {
            SIZE_ASSISTANT_COMPACT => PillWindowSize::AssistantCompact,
            SIZE_ASSISTANT_EXPANDED => PillWindowSize::AssistantExpanded,
            SIZE_ASSISTANT_TYPING => PillWindowSize::AssistantTyping,
            _ => PillWindowSize::Dictation,
        }
    }

    pub fn is_assistant_mode(&self) -> bool {
        self.pill_window_size.load(Ordering::Relaxed) != SIZE_DICTATION
    }
}
