import { Box } from "@mui/material";
import { useEffect } from "react";
import { AgentOverlaySideEffects } from "./AgentOverlaySideEffects";
import { AgentSection } from "./AgentSection";

export const AgentOverlayRoot = () => {
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";
  }, []);

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
