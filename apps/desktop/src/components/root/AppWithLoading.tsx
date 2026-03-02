import { Box } from "@mui/material";
import Router from "../../router";
import { useAppStore } from "../../store";
import { AppSideEffects } from "./AppSideEffects";
import { DictationSideEffects } from "./DictationSideEffects";
import { LoadingApp } from "./LoadingApp";
import { UpdateDialog } from "./UpdateDialog";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  return (
    <>
      <AppSideEffects />
      <UpdateDialog />
      <DictationSideEffects />
      <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {initialized ? <Router /> : <LoadingApp />}
      </Box>
    </>
  );
};
