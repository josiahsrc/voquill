import { Box } from "@mui/material";
import Router from "../../router";
import { useAppStore } from "../../store";
import { LoadingApp } from "./LoadingApp";
import { AppSideEffects } from "./AppSideEffects";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  return (
    <>
      <AppSideEffects />
      <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {initialized ? <Router /> : <LoadingApp />}
      </Box>
    </>
  );
};
