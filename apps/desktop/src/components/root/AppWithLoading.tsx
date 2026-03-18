import { Box } from "@mui/material";
import Router from "../../router";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { AppSideEffects } from "./AppSideEffects";
import { DictationSideEffects } from "./DictationSideEffects";
import { KeyPressSideEffects } from "./KeyPressSideEffects";
import { LoadingApp } from "./LoadingApp";
import { UpdateDialog } from "./UpdateDialog";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  return (
    <>
      {/* Linux uses compositor for hotkeys, so we emulate key-pressed here */}
      {getPlatform() === "linux" && <KeyPressSideEffects />}

      <AppSideEffects />
      <UpdateDialog />
      <DictationSideEffects />
      <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
        {initialized ? <Router /> : <LoadingApp />}
      </Box>
    </>
  );
};
