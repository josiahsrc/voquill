import { Box } from "@mui/material";
import Router from "../../router";
import { useAppStore } from "../../store";
import { AppSideEffects } from "./AppSideEffects";
import { DictationSideEffects } from "./DictationSideEffects";
import { KeyPressSideEffects } from "./KeyPressSideEffects";
import { MigratorSideEffects } from "./MigratorSideEffects";
import { LoadingApp } from "./LoadingApp";
import { UpdateDialog } from "./UpdateDialog";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);
  const hotkeyStrategy = useAppStore((state) => state.hotkeyStrategy);

  return (
    <>
      {hotkeyStrategy === "bridge" && <KeyPressSideEffects />}
      <AppSideEffects />
      <UpdateDialog />
      <MigratorSideEffects />
      <DictationSideEffects />
      <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {initialized ? <Router /> : <LoadingApp />}
      </Box>
    </>
  );
};
