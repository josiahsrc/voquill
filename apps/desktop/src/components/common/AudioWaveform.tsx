import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const TAU = Math.PI * 2;
const LEVEL_SMOOTHING = 0.18;
const TARGET_DECAY_PER_FRAME = 0.985;
const WAVE_BASE_PHASE_STEP = 0.11;
const WAVE_PHASE_GAIN = 0.32;
const MIN_AMPLITUDE = 0.03;
const MAX_AMPLITUDE = 1.3;
const PROCESSING_BASE_LEVEL = 0.16;
const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 36;

type WaveConfig = {
  frequency: number;
  multiplier: number;
  phaseOffset: number;
  opacity: number;
};

const WAVE_CONFIG: WaveConfig[] = [
  { frequency: 0.8, multiplier: 1.6, phaseOffset: 0, opacity: 1 },
  { frequency: 1.0, multiplier: 1.35, phaseOffset: 0.85, opacity: 0.78 },
  { frequency: 1.25, multiplier: 1.05, phaseOffset: 1.7, opacity: 0.56 },
];

type AnimationState = {
  phase: number;
  currentLevel: number;
  targetLevel: number;
};

const createWavePath = (
  width: number,
  baseline: number,
  amplitude: number,
  frequency: number,
  phase: number,
): string => {
  const segments = Math.max(72, Math.floor(width / 2));
  let path = `M 0 ${baseline + amplitude * Math.sin(phase)}`;

  for (let index = 1; index <= segments; index += 1) {
    const t = index / segments;
    const x = width * t;
    const theta = frequency * t * TAU + phase;
    const y = baseline + amplitude * Math.sin(theta);
    path += ` L ${x} ${y}`;
  }

  return path;
};

export type AudioWaveformProps = {
  levels: number[];
  active: boolean;
  processing?: boolean;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
};

export const AudioWaveform = ({
  levels,
  active,
  processing = false,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  strokeColor,
  strokeWidth = 1.6,
  className,
  style,
}: AudioWaveformProps) => {
  const theme = useTheme();
  const resolvedColor = strokeColor ?? theme.vars?.palette.primary.main;
  const waveRefs = useRef<(SVGPathElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const animationStateRef = useRef<AnimationState>({
    phase: 0,
    currentLevel: 0,
    targetLevel: 0,
  });
  const phaseStateRef = useRef({ active, processing });

  phaseStateRef.current.active = active;
  phaseStateRef.current.processing = processing;
  waveRefs.current.length = WAVE_CONFIG.length;

  useEffect(() => {
    const baseline = height / 2;
    const defaultPath = `M 0 ${baseline} L ${width} ${baseline}`;
    waveRefs.current.forEach((path, index) => {
      if (!path) {
        return;
      }
      path.setAttribute("d", defaultPath);
      path.setAttribute(
        "opacity",
        (WAVE_CONFIG[index]?.opacity ?? 1).toString(),
      );
    });
  }, [width, height]);

  useEffect(() => {
    const state = animationStateRef.current;
    if (!active) {
      state.targetLevel = processing
        ? Math.max(state.targetLevel, PROCESSING_BASE_LEVEL)
        : 0;
      if (!processing) {
        state.currentLevel *= 0.4;
        if (state.currentLevel < 0.0002) {
          state.currentLevel = 0;
        }
      }
    }
  }, [active, processing]);

  useEffect(() => {
    if (!active || levels.length === 0) {
      return;
    }

    const sum = levels.reduce((acc, value) => acc + value, 0);
    const average = sum / levels.length;
    const peak = levels.reduce((acc, value) => (value > acc ? value : acc), 0);
    const combined = Math.min(1, average * 0.9 + peak * 0.85);
    const boosted = Math.min(1, Math.sqrt(combined) * 1.35);

    const state = animationStateRef.current;
    state.targetLevel = Math.min(1, state.targetLevel * 0.25 + boosted * 0.75);
  }, [levels, active]);

  useEffect(() => {
    if (!(active || processing)) {
      const state = animationStateRef.current;
      state.targetLevel = 0;
      state.currentLevel = 0;
      state.phase = 0;

      const baseline = height / 2;
      const defaultPath = `M 0 ${baseline} L ${width} ${baseline}`;

      waveRefs.current.forEach((path, index) => {
        if (!path) {
          return;
        }
        path.setAttribute("d", defaultPath);
        path.setAttribute(
          "opacity",
          (WAVE_CONFIG[index]?.opacity ?? 1).toString(),
        );
      });

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    const step = () => {
      const state = animationStateRef.current;

      state.currentLevel +=
        (state.targetLevel - state.currentLevel) * LEVEL_SMOOTHING;
      if (state.currentLevel < 0.0002) {
        state.currentLevel = 0;
      }

      state.targetLevel *= TARGET_DECAY_PER_FRAME;
      if (state.targetLevel < 0.0005) {
        state.targetLevel = 0;
      }

      const phaseState = phaseStateRef.current;
      const baseLevel =
        phaseState.processing && !phaseState.active ? PROCESSING_BASE_LEVEL : 0;
      const level = Math.max(baseLevel, state.currentLevel);

      const advance = WAVE_BASE_PHASE_STEP + WAVE_PHASE_GAIN * level;
      state.phase = (state.phase + advance) % TAU;

      const baseline = height / 2;
      const waveHeight = height;
      const waveWidth = width;

      waveRefs.current.forEach((path, index) => {
        if (!path) {
          return;
        }
        const config =
          WAVE_CONFIG[index] ?? WAVE_CONFIG[WAVE_CONFIG.length - 1];
        const amplitudeFactor = Math.min(
          MAX_AMPLITUDE,
          Math.max(MIN_AMPLITUDE, level * config.multiplier),
        );
        const amplitude = Math.max(1, waveHeight * 0.75 * amplitudeFactor);
        const phase = state.phase + config.phaseOffset;
        const pathD = createWavePath(
          waveWidth,
          baseline,
          amplitude,
          config.frequency,
          phase,
        );
        path.setAttribute("d", pathD);
        path.setAttribute("opacity", config.opacity.toString());
      });

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, processing, width, height]);

  useEffect(
    () => () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    },
    [],
  );

  return (
    <Box
      className={className}
      style={style}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {WAVE_CONFIG.map((config, index) => (
          <path
            key={config.frequency}
            ref={(node) => {
              waveRefs.current[index] = node;
            }}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={config.opacity}
          />
        ))}
      </svg>
    </Box>
  );
};
