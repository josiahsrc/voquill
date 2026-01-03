import { Box, Paper, Typography } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../../store";

const AGENT_OVERLAY_WIDTH = 300;
const AGENT_OVERLAY_HEIGHT = 200;
const LEFT_MARGIN = 16;
const TOP_MARGIN = 16;

export const AgentOverlayRend = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const phase = useAppStore((state) => state.overlayPhase);
  const isVisible = phase === "recording";

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    const initialize = async () => {
      try {
        await windowRef.setIgnoreCursorEvents(true);
        await windowRef.hide();
      } catch (err) {
        console.error("Failed to initialize agent overlay window", err);
      }
    };

    initialize().catch(() => {});
  }, [windowRef]);

  useEffect(() => {
    let canceled = false;

    const syncVisibility = async () => {
      try {
        if (isVisible) {
          if (canceled) {
            return;
          }

          await windowRef.show();
          await windowRef.setAlwaysOnTop(true);
          await windowRef.setIgnoreCursorEvents(true);
        } else {
          await windowRef.hide();
        }
      } catch (err) {
        if (!canceled) {
          console.error("Failed to toggle agent overlay visibility", err);
        }
      }
    };

    syncVisibility().catch(() => {});

    return () => {
      canceled = true;
    };
  }, [windowRef, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        pointerEvents: "none",
        backgroundColor: "transparent",
        paddingLeft: `${LEFT_MARGIN}px`,
        paddingTop: `${TOP_MARGIN}px`,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: `${AGENT_OVERLAY_WIDTH}px`,
          height: `${AGENT_OVERLAY_HEIGHT}px`,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "background.paper",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          TODO
        </Typography>
      </Paper>
    </Box>
  );
};
