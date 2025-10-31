import { useCallback, useEffect, useRef } from "react";
import { refreshCurrentUser } from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";

const useRefreshCurrentUser = () => {
  const pendingRef = useRef(false);

  return useCallback(async () => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    try {
      await refreshCurrentUser();
    } finally {
      pendingRef.current = false;
    }
  }, []);
};

export const HomeSideEffects = () => {
  const refresh = useRefreshCurrentUser();

  useAsyncEffect(async () => {
    await refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      void refresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return null;
};
