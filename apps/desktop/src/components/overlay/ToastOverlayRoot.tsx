import { Box } from "@mui/material";
import { useEffect } from "react";
import { ToastOverlaySideEffects } from "./ToastOverlaySideEffects";
import { ToastSection } from "./ToastSection";

export const ToastOverlayRoot = () => {
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";
  }, []);

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
