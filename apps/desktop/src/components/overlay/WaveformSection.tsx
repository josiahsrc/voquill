import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { RecordingStatusWidget } from "./RecordingStatusWidget";

const EXPANDED_WIDTH = 120;
const EXPANDED_HEIGHT = 32;
const COLLAPSED_WIDTH = 48;
const COLLAPSED_HEIGHT = 6;

export const WaveformSection = () => {
  const theme = useTheme();
  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const isExpanded = overlayPhase !== "idle";

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: getPlatform() === "macos" ? "12px" : "5%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
          height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
          borderRadius: isExpanded ? theme.spacing(2) : theme.spacing(0.75),
          backgroundColor: alpha(
            theme.palette.common.black,
            isExpanded ? 0.92 : 0.6,
          ),
          border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
          backdropFilter: "blur(14px)",
          boxShadow: isExpanded
            ? `0 10px 35px ${alpha(theme.palette.common.black, 0.36)}`
            : `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
          transition: "all 200ms ease-out",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
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
