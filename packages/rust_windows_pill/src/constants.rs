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

// ── Tooltip (style selector) ──────────────────────────────────────
pub(crate) const TOOLTIP_HEIGHT: f64 = 32.0;
pub(crate) const TOOLTIP_GAP: f64 = 6.0;
pub(crate) const TOOLTIP_RADIUS: f64 = 12.0;
pub(crate) const TOOLTIP_FIXED_WIDTH: f64 = 172.0;

// ── Waveform ─────────────────────────────────────────────────────
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

// ── Loading ──────────────────────────────────────────────────────
pub(crate) const LOADING_BAR_WIDTH_FRAC: f64 = 0.4;
pub(crate) const LOADING_SPEED: f64 = 0.015;

// ── Assistant panel ──────────────────────────────────────────────
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

// ── Flash message / toast ────────────────────────────────────────
pub(crate) const FLASH_DURATION: f64 = 2.5;
pub(crate) const FLASH_HEIGHT: f64 = 32.0;
pub(crate) const FLASH_RADIUS: f64 = 12.0;
pub(crate) const FLASH_GAP: f64 = 6.0;
pub(crate) const FLASH_PADDING_H: f64 = 16.0;
pub(crate) const FLASH_MIN_SCALE: f64 = 0.5;
pub(crate) const FLASH_ACTION_GAP: f64 = 8.0;
pub(crate) const FLASH_ACTION_PADDING_H: f64 = 10.0;
pub(crate) const FLASH_ACTION_HEIGHT: f64 = 22.0;
pub(crate) const FLASH_ACTION_RADIUS: f64 = 6.0;

// ── Fireworks ────────────────────────────────────────────────────
pub(crate) const FIREWORKS_TOTAL_DURATION: f64 = 7.0;
pub(crate) const FIREWORKS_GRAVITY: f64 = 40.0;
pub(crate) const FIREWORKS_SPARK_BASE_SPEED: f64 = 85.0;
pub(crate) const FIREWORKS_SPARK_LIFE: f64 = 1.1;
pub(crate) const FIREWORKS_SPARK_DRAG: f64 = 1.2;
pub(crate) const FIREWORKS_TRAIL_MAX: usize = 15;
pub(crate) const FIREWORKS_TRAIL_FADE_RATE: f64 = 2.0;
pub(crate) const FIREWORKS_ROCKET_LINE_WIDTH: f64 = 1.8;
pub(crate) const FIREWORKS_SPARK_LINE_WIDTH: f64 = 1.2;
pub(crate) const FIREWORKS_HEAD_SIZE: f64 = 4.0;

pub(crate) struct FireworkLaunch {
    pub(crate) time: f64,
    pub(crate) angle_deg: f64,
    pub(crate) speed: f64,
    pub(crate) fuse: f64,
    pub(crate) num_sparks: usize,
}

pub(crate) const FIREWORK_COLORS: &[(f64, f64, f64)] = &[
    (1.0, 0.4, 0.3),
    (0.3, 0.8, 1.0),
    (1.0, 0.85, 0.2),
    (0.4, 1.0, 0.5),
    (1.0, 0.5, 0.9),
    (0.5, 0.6, 1.0),
    (1.0, 0.65, 0.2),
    (0.3, 1.0, 0.9),
    (1.0, 0.35, 0.5),
    (0.7, 0.5, 1.0),
];

pub(crate) const FIREWORK_LAUNCHES: &[FireworkLaunch] = &[
    FireworkLaunch { time: 0.2, angle_deg: -25.0, speed: 140.0, fuse: 0.50, num_sparks: 12 },
    FireworkLaunch { time: 0.8, angle_deg:  30.0, speed: 125.0, fuse: 0.55, num_sparks: 10 },
    FireworkLaunch { time: 1.5, angle_deg: -15.0, speed: 150.0, fuse: 0.45, num_sparks: 14 },
    FireworkLaunch { time: 2.2, angle_deg:  40.0, speed: 115.0, fuse: 0.60, num_sparks: 12 },
    FireworkLaunch { time: 3.0, angle_deg: -35.0, speed: 130.0, fuse: 0.50, num_sparks: 11 },
    FireworkLaunch { time: 3.7, angle_deg:  20.0, speed: 145.0, fuse: 0.50, num_sparks: 13 },
    FireworkLaunch { time: 4.5, angle_deg: -40.0, speed: 120.0, fuse: 0.55, num_sparks: 10 },
    FireworkLaunch { time: 5.2, angle_deg:  15.0, speed: 150.0, fuse: 0.45, num_sparks: 14 },
    FireworkLaunch { time: 5.9, angle_deg: -30.0, speed: 125.0, fuse: 0.50, num_sparks: 12 },
    FireworkLaunch { time: 6.4, angle_deg:  35.0, speed: 140.0, fuse: 0.55, num_sparks: 11 },
];

// ── Flame ───────────────────────────────────────────────────────
pub(crate) const FLAME_TOTAL_DURATION: f64 = 5.0;
pub(crate) const FLAME_TONGUE_COUNT: usize = 5;
pub(crate) const FLAME_MIN_HEIGHT: f64 = 90.0;
pub(crate) const FLAME_MAX_HEIGHT: f64 = 150.0;
pub(crate) const FLAME_MIN_WIDTH: f64 = 36.0;
pub(crate) const FLAME_MAX_WIDTH: f64 = 60.0;
pub(crate) const FLAME_SWAY: f64 = 6.0;
pub(crate) const FLAME_SPEED_BASE: f64 = 4.5;

// ── Thinking shimmer ──────────────────────────────────────────────
pub(crate) const SHIMMER_SPEED: f64 = 0.01;

// ── Flash blue border ─────────────────────────────────────────────
pub(crate) const FLASH_BLUE_DURATION: f64 = 0.9;
pub(crate) const FLASH_BLUE_BORDER_WIDTH: f64 = 3.0;
pub(crate) const FLASH_BLUE_INSET: f64 = 2.0;
pub(crate) const FLASH_BLUE_COLOR: (f64, f64, f64) = (0.25, 0.6, 1.0);
pub(crate) const FLASH_BLUE_GLOW_COLOR: (f64, f64, f64) = (0.45, 0.75, 1.0);

// ── Broadcast transcript ──────────────────────────────────────────
pub(crate) const TRANSCRIPT_FADE_DELAY: f64 = 3.0;
pub(crate) const TRANSCRIPT_FADE_SPEED: f64 = 6.0;
pub(crate) const TRANSCRIPT_RISE_SPEED: f64 = 12.0;
pub(crate) const TRANSCRIPT_GAP: f64 = 8.0;
pub(crate) const TRANSCRIPT_HEIGHT: f64 = 28.0;
pub(crate) const TRANSCRIPT_PADDING_H: f64 = 14.0;
pub(crate) const TRANSCRIPT_RADIUS: f64 = 10.0;
pub(crate) const TRANSCRIPT_FONT_SIZE: f64 = 12.0;
pub(crate) const TRANSCRIPT_MAX_WIDTH: f64 = 440.0;
