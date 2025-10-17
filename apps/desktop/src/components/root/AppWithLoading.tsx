import { Box } from "@mui/material";
import { useAsyncEffect } from "../../hooks/async.hooks";
import Router from "../../router";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { LoadingApp } from "./LoadingApp";
import { getUserRepo } from "../../repos";
import { getMyUserId } from "../../utils/user.utils";
import { registerUsers } from "../../utils/app.utils";
import { listify } from "@repo/utilities";

export const AppWithLoading = () => {
  const initialized = useAppStore((state) => state.initialized);

  useAsyncEffect(async () => {
    if (initialized) {
      return;
    }

    const state = getAppState();
    const userId = getMyUserId(state);
    const user = await getUserRepo().getUser(userId);

    produceAppState((draft) => {
      draft.initialized = true;
      registerUsers(draft, listify(user));
    });
  }, [initialized]);

  return (
    <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {initialized ? <Router /> : <LoadingApp />}
    </Box>
  );
};
