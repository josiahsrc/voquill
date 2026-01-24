import { Box } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { AgentOverlaySideEffects } from "./AgentOverlaySideEffects";
import { AgentSection } from "./AgentSection";

export const AgentOverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    windowRef.setIgnoreCursorEvents(true).catch(console.error);
  }, [windowRef]);

  return (
    <>
      <AgentOverlaySideEffects />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          pointerEvents: "none",
        }}
      >
        <AgentSection />
      </Box>
    </>
  );
};
