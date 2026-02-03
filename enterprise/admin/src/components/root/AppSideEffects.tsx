import { useCallback, useEffect } from "react";
import { setAuthTokens } from "../../actions/login.actions";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { produceAppState } from "../../store";
import { invoke } from "../../utils/api.utils";

const FIVE_MINUTES = 5 * 60 * 1000;

const refreshAuthTokens = async () => {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!token || !refreshToken) {
    return;
  }

  produceAppState((draft) => {
    draft.token = token;
    draft.refreshToken = refreshToken;
  });

  try {
    const data = await invoke("auth/refresh", { refreshToken });
    setAuthTokens(data.token, data.refreshToken);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }
};

export const AppSideEffects = () => {
  useIntervalAsync(FIVE_MINUTES, async () => {
    await refreshAuthTokens().finally(() => {
      produceAppState((draft) => {
        draft.initialized = true;
      });
    });
  }, []);

  const onVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      refreshAuthTokens();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onVisibilityChange]);

  return null;
};
