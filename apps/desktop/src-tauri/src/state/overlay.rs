use std::sync::atomic::{AtomicU8, Ordering};

use crate::domain::OverlayPhase;

const PHASE_IDLE: u8 = 0;
const PHASE_RECORDING: u8 = 1;
const PHASE_LOADING: u8 = 2;

pub struct OverlayState {
    phase: AtomicU8,
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
}
