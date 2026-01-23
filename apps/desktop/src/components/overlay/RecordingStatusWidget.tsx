import { Box, LinearProgress } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AudioWaveform } from "../common/AudioWaveform";
import { useAppStore } from "../../store";

export const RecordingStatusWidget = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const isListening = phase === "recording";
  const isProcessing = phase === "loading";

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
        {isProcessing ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <LinearProgress sx={{ width: "100%", height: "2px" }} />
          </Box>
        ) : (
          <AudioWaveform
            levels={levels}
            active={isListening}
            processing={isProcessing}
            strokeColor={theme.palette.common.white}
            width={120}
            height={36}
            style={{
              opacity: isProcessing ? 0 : 1,
              transition: "opacity 160ms ease",
            }}
          />
        )}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, ${alpha(
              theme.palette.common.black,
              0.9,
            )} 0%, transparent 18%, transparent 85%, ${alpha(
              theme.palette.common.black,
              0.9,
            )} 100%)`,
          }}
        />
      </Box>
    </Box>
  );
};
