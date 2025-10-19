import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useAppStore } from "../../store";

const VIEWBOX_WIDTH = 120;
const VIEWBOX_HEIGHT = 36;
const TAU = Math.PI * 2;

const LEVEL_SMOOTHING = 0.18;
const TARGET_DECAY_PER_FRAME = 0.985;
const WAVE_BASE_PHASE_STEP = 0.11;
const WAVE_PHASE_GAIN = 0.32;
const MIN_AMPLITUDE = 0.03;
const MAX_AMPLITUDE = 1.3;
const PROCESSING_BASE_LEVEL = 0.16;

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
  phase: number
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

export const RecordingStatusWidget = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const isListening = phase === "recording";
  const isProcessing = phase === "loading";

  const waveRefs = useRef<(SVGPathElement | null)[]>([]);
  const animationFrameRef = useRef<number>(null);
  const animationStateRef = useRef<AnimationState>({
    phase: 0,
    currentLevel: 0,
    targetLevel: 0,
  });
  const phaseStateRef = useRef({ isListening, isProcessing });

  phaseStateRef.current.isListening = isListening;
  phaseStateRef.current.isProcessing = isProcessing;

  useEffect(() => {
    const state = animationStateRef.current;
    if (!isListening) {
      state.targetLevel = isProcessing
        ? Math.max(state.targetLevel, PROCESSING_BASE_LEVEL)
        : 0;
      if (!isProcessing) {
        state.currentLevel *= 0.4;
      }
    }
  }, [isListening, isProcessing]);

  useEffect(() => {
    if (!isListening || levels.length === 0) {
      return;
    }

    const sum = levels.reduce((acc, value) => acc + value, 0);
    const average = sum / levels.length;
    const peak = levels.reduce((acc, value) => (value > acc ? value : acc), 0);
    const combined = Math.min(1, average * 0.9 + peak * 0.85);
    const boosted = Math.min(1, Math.sqrt(combined) * 1.35);

    const state = animationStateRef.current;
    state.targetLevel = Math.min(1, state.targetLevel * 0.25 + boosted * 0.75);
  }, [levels, isListening]);

  useEffect(() => {
    const baseline = VIEWBOX_HEIGHT / 2;
    const defaultPath = `M 0 ${baseline} L ${VIEWBOX_WIDTH} ${baseline}`;
    waveRefs.current.forEach((path) => {
      if (path) {
        path.setAttribute("d", defaultPath);
      }
    });
  }, []);

  useEffect(() => {
    if (!(isListening || isProcessing)) {
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
        phaseState.isProcessing && !phaseState.isListening
          ? PROCESSING_BASE_LEVEL
          : 0;
      const level = Math.max(baseLevel, state.currentLevel);

      const advance = WAVE_BASE_PHASE_STEP + WAVE_PHASE_GAIN * level;
      state.phase = (state.phase + advance) % TAU;

      const baseline = VIEWBOX_HEIGHT / 2;
      const height = VIEWBOX_HEIGHT;
      const width = VIEWBOX_WIDTH;

      waveRefs.current.forEach((path, index) => {
        if (!path) {
          return;
        }
        const config =
          WAVE_CONFIG[index] ?? WAVE_CONFIG[WAVE_CONFIG.length - 1];
        const amplitudeFactor = Math.min(
          MAX_AMPLITUDE,
          Math.max(MIN_AMPLITUDE, level * config.multiplier)
        );
        const amplitude = Math.max(1, height * 0.75 * amplitudeFactor);
        const phase = state.phase + config.phaseOffset;
        const pathD = createWavePath(
          width,
          baseline,
          amplitude,
          config.frequency,
          phase
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
  }, [isListening, isProcessing]);

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${theme.spacing(0.75)} ${theme.spacing(2)}`,
        borderRadius: theme.spacing(2.25),
        backgroundColor: alpha(theme.palette.common.black, 0.92),
        backdropFilter: "blur(14px)",
        boxShadow: `0 10px 35px ${alpha(theme.palette.common.black, 0.36)}`,
        minWidth: theme.spacing(16),
        height: theme.spacing(4),
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: theme.spacing(16),
          height: theme.spacing(3),
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
        >
          {WAVE_CONFIG.map((config, index) => (
            <path
              key={config.frequency}
              ref={(node) => {
                waveRefs.current[index] = node;
              }}
              fill="none"
              stroke={theme.palette.common.white}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, ${alpha(
              theme.palette.common.black,
              0.9
            )} 0%, transparent 18%, transparent 85%, ${alpha(
              theme.palette.common.black,
              0.9
            )} 100%)`,
          }}
        />
      </Box>
    </Box>
  );
};
