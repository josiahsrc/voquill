import { Box } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { ToastOverlaySideEffects } from "./ToastOverlaySideEffects";
import { ToastSection } from "./ToastSection";

export const ToastOverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    windowRef.setIgnoreCursorEvents(true).catch(console.error);
  }, [windowRef]);

  return (
    <>
      <ToastOverlaySideEffects />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      >
        <ToastSection />
      </Box>
    </>
  );
};
