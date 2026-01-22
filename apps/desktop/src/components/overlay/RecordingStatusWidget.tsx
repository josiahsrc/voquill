import { Box, LinearProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { AudioWaveform } from "../common/AudioWaveform";

export const RecordingStatusWidget = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const isIdle = phase === "idle";
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          sx={{
            position: "absolute",
            color: alpha(theme.palette.common.white, 0.4),
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            opacity: isIdle ? 1 : 0,
            transition: "opacity 150ms ease-out",
          }}
        >
          <FormattedMessage defaultMessage="Click to dictate" />
        </Typography>
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isProcessing ? 1 : 0,
            transition: "opacity 150ms ease-out",
          }}
        >
          <LinearProgress sx={{ width: "100%", height: "2px" }} />
        </Box>
        <Box
          sx={{
            position: "absolute",
            opacity: isListening ? 1 : 0,
            transition: "opacity 150ms ease-out",
          }}
        >
          <AudioWaveform
            levels={levels}
            active={isListening}
            processing={isProcessing}
            strokeColor={theme.palette.common.white}
            width={120}
            height={36}
            baselineOffset={3}
          />
        </Box>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: isIdle ? 0 : 1,
            transition: "opacity 150ms ease-out",
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
