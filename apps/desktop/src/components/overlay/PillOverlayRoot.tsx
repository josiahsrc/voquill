import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useTauriListen } from "../../hooks/tauri.hooks";

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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isHovered ? "#4caf50" : "#f44336",
        borderRadius: "8px",
      }}
    />
  );
};
