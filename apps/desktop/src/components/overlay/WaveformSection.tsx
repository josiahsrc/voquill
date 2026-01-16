import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { RecordingStatusWidget } from "./RecordingStatusWidget";

const EXPANDED_WIDTH = 180;
const EXPANDED_HEIGHT = 32;
const COLLAPSED_WIDTH = 48;
const COLLAPSED_HEIGHT = 6;

export const WaveformSection = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const isExpanded = phase !== "idle";
  const isMacOS = getPlatform() === "macos";

  if (isMacOS) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: isExpanded ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
          height: isExpanded ? `${EXPANDED_HEIGHT}px` : `${COLLAPSED_HEIGHT}px`,
          borderRadius: isExpanded ? theme.spacing(2.25) : theme.spacing(0.75),
          backgroundColor: alpha(theme.palette.common.black, isExpanded ? 0.92 : 0.6),
          backdropFilter: "blur(14px)",
          boxShadow: isExpanded
            ? `0 10px 35px ${alpha(theme.palette.common.black, 0.36)}`
            : `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
          transition: "all 200ms ease-out",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 150ms ease-out",
            pointerEvents: "none",
          }}
        >
          {isExpanded && <RecordingStatusWidget />}
        </Box>
      </Box>
    </Box>
  );
};
