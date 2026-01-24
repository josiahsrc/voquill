use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};

use crate::domain::OverlayPhase;

const PHASE_IDLE: u8 = 0;
const PHASE_RECORDING: u8 = 1;
const PHASE_LOADING: u8 = 2;

pub struct OverlayState {
    phase: AtomicU8,
    pill_hover_enabled: AtomicBool,
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
            pill_hover_enabled: AtomicBool::new(false),
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
        self.pill_hover_enabled.store(enabled, Ordering::Relaxed);
    }

    pub fn is_pill_hover_enabled(&self) -> bool {
        self.pill_hover_enabled.load(Ordering::Relaxed)
    }
}
