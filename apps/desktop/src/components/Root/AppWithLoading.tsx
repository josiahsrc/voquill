import { useEffect } from "react";
import Router from "../../router";
import { produceAppState, useAppStore } from "../../store";
import { LoadingApp } from "./LoadingApp";
import { Box } from "@mui/material";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) {
      produceAppState((draft) => {
        draft.initialized = true;
      });
    }
  }, [initialized]);

  return (
    <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {initialized ? <Router /> : <LoadingApp />}
    </Box>
  );
};
