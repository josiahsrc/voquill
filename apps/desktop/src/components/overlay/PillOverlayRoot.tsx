import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";

export const PILL_OVERLAY_WIDTH = 196;
export const PILL_OVERLAY_HEIGHT = 128;
export const MIN_PILL_WIDTH = 98;
export const MIN_PILL_HEIGHT = 32;

type PillHoverPayload = {
  hovered: boolean;
};

export const PillOverlayRoot = () => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  useTauriListen<PillHoverPayload>("pill_hover", (payload) => {
    setIsHovered(payload.hovered);
  });

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backgroundColor: "#f44336",
        borderRadius: "8px",
      }}
    >
      <Box
        sx={{
          width: MIN_PILL_WIDTH,
          height: MIN_PILL_HEIGHT,
          backgroundColor: isHovered ? "#4caf50" : "#ffeb3b",
          borderRadius: "4px",
        }}
      />
    </Box>
  );
};
