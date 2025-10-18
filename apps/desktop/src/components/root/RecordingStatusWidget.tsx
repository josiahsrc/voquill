import { alpha, useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import type { RecordingState } from "../../hooks/useRecordingTelemetry";

type RecordingStatusWidgetProps = {
  recordingState: RecordingState;
};

export const RecordingStatusWidget = ({
  recordingState,
}: RecordingStatusWidgetProps) => {
  const theme = useTheme();
  const indicatorColor =
    recordingState.phase === "listening"
      ? theme.palette.error.main
      : recordingState.phase === "processing"
        ? theme.palette.warning.main
        : alpha(theme.palette.text.primary, 0.4);
  const message =
    recordingState.phase === "listening"
      ? "Listening..."
      : recordingState.phase === "processing"
        ? "Transcribing..."
        : "Done";
  const animation = "none";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
        borderRadius: theme.spacing(1.5),
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${alpha(indicatorColor, 0.15)}`,
        minWidth: theme.spacing(20),
        justifyContent: "center",
        willChange: "opacity",
        contain: "paint",
      }}
    >
      <Box
        sx={{
          width: theme.spacing(2),
          height: theme.spacing(2),
          borderRadius: "50%",
          backgroundColor: indicatorColor,
          boxShadow: `0 0 8px ${alpha(indicatorColor, 0.3)}`,
          animation,
          transform: "translateZ(0)",
          willChange: "transform, opacity",
        }}
      />
      <Typography
        variant="subtitle2"
        sx={{
          color: theme.palette.text.primary,
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};
