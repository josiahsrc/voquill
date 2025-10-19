import { alpha, useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";
import { keyframes } from "@mui/system";
import { useRef } from "react";
import { useAppStore } from "../../store";
import { useRecordingTelemetry } from "../../hooks/useRecordingTelemetry";

const BAR_COUNT = 6;

const pulse = keyframes`
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
`;

export const RecordingStatusWidget = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const { recordingState } = useRecordingTelemetry();
  const isListening = phase === "recording";
  const isProcessing = phase === "loading";

  // Track the maximum level seen in each frequency bin for adaptive normalization
  const maxLevelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0.001)); // Start with small non-zero
  
  // Map each bar to different frequency ranges from the levels array
  const getBarLevel = (barIndex: number) => {
    const levels = recordingState.levels;
    if (levels.length === 0) return 0;
    
    // Divide the frequency spectrum into segments for each bar
    const segmentSize = Math.max(1, Math.floor(levels.length / BAR_COUNT));
    const startIdx = barIndex * segmentSize;
    const endIdx = Math.min(levels.length, startIdx + segmentSize);
    
    // Get average for this frequency range
    const segment = levels.slice(startIdx, endIdx);
    const avg = segment.reduce((sum, level) => sum + level, 0) / segment.length;
    
    // Start with aggressive amplification
    const initialAmplification = 30;
    const amplified = avg * initialAmplification;
    
    // Track the max level seen in this bin
    const currentMax = maxLevelsRef.current[barIndex];
    if (amplified > currentMax) {
      maxLevelsRef.current[barIndex] = amplified;
    }
    
    // Normalize based on the max we've seen, so 1.0 = loudest sound in this bin
    const normalized = currentMax > 0 ? Math.min(1, amplified / currentMax) : 0;
    
    return normalized;
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${theme.spacing(0.75)} ${theme.spacing(2)}`,
        borderRadius: theme.spacing(1.5),
        backgroundColor: alpha(theme.palette.common.white, 0.98),
        backdropFilter: "blur(12px)",
        boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.08)}`,
        minWidth: theme.spacing(10),
        height: theme.spacing(3.5),
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {isListening ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing(0.75),
            height: "100%",
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, index) => {
            const barLevel = getBarLevel(index);
            
            // Map level to height: minimum 15%, maximum 100%
            const minHeight = 0.3;
            const heightPercent = minHeight + barLevel * (1 - minHeight);
            
            // Vary transition speed slightly per bar for more organic movement
            const transitionSpeed = 80 + (index % 3) * 10;
            
            return (
              <Box
                key={index}
                sx={{
                  width: theme.spacing(0.5),
                  height: "100%",
                  borderRadius: theme.spacing(0.75),
                  backgroundColor: theme.palette.common.black,
                  transformOrigin: "center",
                  transform: `scaleY(${heightPercent})`,
                  transition: `transform ${transitionSpeed}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              />
            );
          })}
        </Box>
      ) : isProcessing ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing(0.75),
            height: "100%",
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, index) => {
            // Stagger the animation for each bar
            const delay = index * 100;
            
            return (
              <Box
                key={index}
                sx={{
                  width: theme.spacing(0.5),
                  height: "100%",
                  borderRadius: theme.spacing(0.75),
                  backgroundColor: theme.palette.common.black,
                  transformOrigin: "center",
                  animation: `${pulse} 600ms ease-in-out infinite`,
                  animationDelay: `${delay}ms`,
                }}
              />
            );
          })}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing(0.75),
            height: "100%",
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, index) => (
            <Box
              key={index}
              sx={{
                width: theme.spacing(0.5),
                height: "100%",
                borderRadius: theme.spacing(0.75),
                backgroundColor: theme.palette.common.black,
                transformOrigin: "center",
                transform: "scaleY(0.3)",
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
