import { Box } from "@mui/material";
import { useEffect } from "react";

export const PillOverlayRoot = () => {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f44336",
        borderRadius: "8px",
      }}
    />
  );
};
