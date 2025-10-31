import { Box } from "@mui/material";
import { useAsyncEffect } from "../../hooks/async.hooks";
import Router from "../../router";
import { produceAppState, useAppStore } from "../../store";
import { LoadingApp } from "./LoadingApp";
import { refreshCurrentUser } from "../../actions/user.actions";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  useAsyncEffect(async () => {
    if (initialized) {
      return;
    }

    try {
      await refreshCurrentUser();
    } finally {
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
