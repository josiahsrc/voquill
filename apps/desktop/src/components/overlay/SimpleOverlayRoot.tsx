import { Box, Button } from "@mui/material";
import { useEffect } from "react";

export const SimpleOverlayRoot = () => {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  const handleClick = () => {
    console.log("Button clicked");
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2196f3",
        borderRadius: "8px",
      }}
    >
      <Button
        variant="contained"
        onClick={handleClick}
        sx={{
          backgroundColor: "#1976d2",
          "&:hover": {
            backgroundColor: "#1565c0",
          },
        }}
      >
        text
      </Button>
    </Box>
  );
};
