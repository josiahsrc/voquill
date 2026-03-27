use std::f64::consts::PI;

pub(crate) const TAU: f64 = PI * 2.0;

// ── Dictation pill layout ──────────────────────────────────────────
pub(crate) const DICTATION_WINDOW_WIDTH: i32 = 200;
pub(crate) const DICTATION_WINDOW_HEIGHT: i32 = 86;
pub(crate) const MARGIN_BOTTOM: i32 = 8;

pub(crate) const PILL_AREA_HEIGHT: f64 = 48.0;

pub(crate) const MIN_PILL_WIDTH: f64 = 48.0;
pub(crate) const MIN_PILL_HEIGHT: f64 = 6.0;
pub(crate) const EXPANDED_PILL_WIDTH: f64 = 120.0;
pub(crate) const EXPANDED_PILL_HEIGHT: f64 = 32.0;

pub(crate) const COLLAPSED_RADIUS: f64 = 6.0;
pub(crate) const EXPANDED_RADIUS: f64 = 16.0;
pub(crate) const IDLE_BG_ALPHA: f64 = 0.6;
pub(crate) const ACTIVE_BG_ALPHA: f64 = 0.92;
pub(crate) const BORDER_ALPHA: f64 = 0.3;

pub(crate) const SPRING_STIFFNESS: f64 = 200.0;
pub(crate) const SPRING_DT: f64 = 0.016;

// ── Tooltip (style selector) ──────────────────────────────────────
pub(crate) const TOOLTIP_HEIGHT: f64 = 24.0;
pub(crate) const TOOLTIP_GAP: f64 = 6.0;
pub(crate) const TOOLTIP_RADIUS: f64 = 8.0;

// ── Waveform — ported from AudioWaveform.tsx ──────────────────────
pub(crate) const LEVEL_SMOOTHING: f64 = 0.18;
pub(crate) const TARGET_DECAY_PER_FRAME: f64 = 0.985;
pub(crate) const WAVE_BASE_PHASE_STEP: f64 = 0.11;
pub(crate) const WAVE_PHASE_GAIN: f64 = 0.32;
pub(crate) const MIN_AMPLITUDE: f64 = 0.03;
pub(crate) const MAX_AMPLITUDE: f64 = 1.3;
pub(crate) const STROKE_WIDTH: f64 = 1.6;
pub(crate) const PROCESSING_BASE_LEVEL: f64 = 0.16;

pub(crate) struct WaveConfig {
    pub(crate) frequency: f64,
    pub(crate) multiplier: f64,
    pub(crate) phase_offset: f64,
    pub(crate) opacity: f64,
}

pub(crate) const WAVE_CONFIGS: &[WaveConfig] = &[
    WaveConfig { frequency: 0.8, multiplier: 1.6, phase_offset: 0.0, opacity: 1.0 },
    WaveConfig { frequency: 1.0, multiplier: 1.35, phase_offset: 0.85, opacity: 0.78 },
    WaveConfig { frequency: 1.25, multiplier: 1.05, phase_offset: 1.7, opacity: 0.56 },
];

// ── Loading — MUI LinearProgress indeterminate ────────────────────
pub(crate) const LOADING_BAR_WIDTH_FRAC: f64 = 0.4;
pub(crate) const LOADING_SPEED: f64 = 0.015;

// ── Assistant panel — matching AssistantModePanel.tsx ──────────────
pub(crate) const PANEL_COMPACT_WIDTH: f64 = 424.0;
#[allow(dead_code)]
pub(crate) const PANEL_COMPACT_HEIGHT: f64 = 120.0;
pub(crate) const PANEL_EXPANDED_WIDTH: f64 = 572.0;
#[allow(dead_code)]
pub(crate) const PANEL_EXPANDED_HEIGHT: f64 = 258.0;
#[allow(dead_code)]
pub(crate) const PANEL_TYPING_HEIGHT: f64 = 338.0;
pub(crate) const PANEL_RADIUS: f64 = 24.0;
pub(crate) const PANEL_BG_ALPHA: f64 = 0.96;
pub(crate) const PANEL_BORDER_ALPHA: f64 = 0.12;
pub(crate) const PANEL_INPUT_HEIGHT: f64 = 48.0;
pub(crate) const PANEL_HEADER_OFFSET_TOP: f64 = 10.0;
pub(crate) const PANEL_HEADER_OFFSET_LEFT: f64 = 10.0;
pub(crate) const PANEL_HEADER_OFFSET_RIGHT: f64 = 24.0;
pub(crate) const PANEL_CONTENT_SIDE_INSET: f64 = 24.0;
pub(crate) const PANEL_TRANSCRIPT_TOP_OFFSET: f64 = 56.0;
pub(crate) const HEADER_BUTTON_SIZE: f64 = 28.0;
pub(crate) const SCROLL_TOP_PAD: f64 = 12.0;
pub(crate) const SCROLL_BOTTOM_PAD: f64 = 12.0;

pub(crate) const PILL_BOTTOM_INSET: f64 = 8.0;

pub(crate) const PANEL_TOP_MARGIN: f64 = 14.0;
pub(crate) const PANEL_BOTTOM_MARGIN: f64 = 10.0;

pub(crate) const KB_BUTTON_SIZE: f64 = 32.0;
pub(crate) const KB_BUTTON_GAP: f64 = 8.0;

pub(crate) const CANCEL_BUTTON_SIZE: f64 = 18.0;

pub(crate) const PERM_CARD_HEIGHT: f64 = 68.0;
pub(crate) const PERM_BUTTON_WIDTH: f64 = 80.0;
pub(crate) const PERM_BUTTON_HEIGHT: f64 = 26.0;
pub(crate) const PERM_BUTTON_GAP: f64 = 6.0;

// ── Window sizes for each mode ────────────────────────────────────
pub(crate) const WINDOW_W_COMPACT: i32 = 452;
pub(crate) const WINDOW_H_COMPACT: i32 = 144;
pub(crate) const WINDOW_W_EXPANDED: i32 = 600;
pub(crate) const WINDOW_H_EXPANDED: i32 = 282;
pub(crate) const WINDOW_W_TYPING: i32 = 600;
pub(crate) const WINDOW_H_TYPING: i32 = 362;

// ── Thinking shimmer ──────────────────────────────────────────────
pub(crate) const SHIMMER_SPEED: f64 = 0.01;
