import { Box } from "@mui/material";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { RecordingStatusWidget } from "./RecordingStatusWidget";

const OVERLAY_WIDTH = 360;
const OVERLAY_HEIGHT = 40;

export const WaveformSection = () => {
  const phase = useAppStore((state) => state.overlayPhase);
  const isVisible = phase !== "idle";
  const isMacOS = getPlatform() === "macos";

  if (isMacOS || !isVisible) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: `${OVERLAY_WIDTH}px`,
        height: `${OVERLAY_HEIGHT}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <RecordingStatusWidget />
    </Box>
  );
};
