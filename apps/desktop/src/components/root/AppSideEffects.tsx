import { invokeHandler } from "@repo/functions";
import { FullConfig, Member, Nullable, User } from "@repo/types";
import { listify } from "@repo/utilities";
import { useEffect, useRef, useState } from "react";
import { combineLatest, from, Observable, of } from "rxjs";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  migrateLocalUserToCloud,
  refreshCurrentUser,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useKeyDownHandler } from "../../hooks/helper.hooks";
import { useStreamWithSideEffects } from "../../hooks/stream.hooks";
import { produceAppState, useAppStore } from "../../store";
import { AuthUser } from "../../types/auth.types";
import { registerMembers, registerUsers } from "../../utils/app.utils";
import { LOCAL_USER_ID } from "../../utils/user.utils";
import { getIsDevMode } from "../../utils/env.utils";
import { auth } from "../../main";

type StreamRet = Nullable<
  [Nullable<Member>, Nullable<User>, Nullable<FullConfig>]
>;

// Timeout for Firebase Auth initialization (handles cases where IndexedDB hangs on some Linux systems)
const AUTH_READY_TIMEOUT_MS = 4_000;

export const AppSideEffects = () => {
  const [authReady, setAuthReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [initReady, setInitReady] = useState(false);
  const authReadyRef = useRef(false);
  const userId = useAppStore((state) => state.auth?.uid ?? "");
  const initialized = useAppStore((state) => state.initialized);
  const member = useAppStore((state) => {
    const uid = state.auth?.uid;
    return uid ? (state.memberById[uid] ?? null) : null;
  });
  const localUser = useAppStore(
    (state) => state.userById[LOCAL_USER_ID] ?? null,
  );
  const cloudUser = useAppStore((state) => {
    const uid = state.auth?.uid;
    return uid ? (state.userById[uid] ?? null) : null;
  });

  const onAuthStateChanged = (user: AuthUser | null) => {
    authReadyRef.current = true;
    setAuthReady(true);
    produceAppState((draft) => {
      draft.auth = user;
      draft.initialized = false;
    });
  };

  useEffect(() => {
    // Safety timeout: if Firebase Auth doesn't respond within the timeout,
    // proceed with null auth state. This handles cases where IndexedDB
    // initialization hangs on some Linux systems.
    const timeoutId = setTimeout(() => {
      if (!authReadyRef.current) {
        console.warn(
          "[AppSideEffects] Firebase Auth timed out, proceeding without auth",
        );
        onAuthStateChanged(null);
      }
    }, AUTH_READY_TIMEOUT_MS);

    const unsubscribe = auth.onAuthStateChanged(
      onAuthStateChanged,
      (error) => {
        showErrorSnackbar(error);
        onAuthStateChanged(null);
      },
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  useStreamWithSideEffects({
    builder: (): Observable<StreamRet> => {
      if (!authReady) {
        return of(null);
      }

      if (!userId) {
        return combineLatest([of(null), of(null), of(null)]);
      }

      return combineLatest([
        from(
          invokeHandler("member/getMyMember", {})
            .then((res) => res.member)
            .catch(() => null),
        ),
        from(
          invokeHandler("user/getMyUser", {})
            .then((res) => res.user)
            .catch(() => null),
        ),
        from(
          invokeHandler("config/getFullConfig", {})
            .then((res) => res.config)
            .catch(() => null),
        ),
      ]);
    },
    onSuccess: (results) => {
      setStreamReady(true);
      if (results === null) {
        return;
      }

      const [members, user, config] = results;
      produceAppState((draft) => {
        registerUsers(draft, listify(user));
        registerMembers(draft, listify(members));
        draft.config = config;
      });
    },
    dependencies: [userId, authReady],
  });

  useAsyncEffect(async () => {
    if (authReady) {
      await refreshCurrentUser();
      setInitReady(true);
    }
  }, [authReady]);

  useEffect(() => {
    if (streamReady && initReady && !initialized) {
      produceAppState((draft) => {
        draft.initialized = true;
      });
    }
  }, [streamReady, initReady, initialized]);

  const isMigratingLocalUserRef = useRef(false);
  const memberPlan = member?.plan;
  useEffect(() => {
    if (!userId || !memberPlan) {
      return;
    }

    if (memberPlan !== "free" && memberPlan !== "pro") {
      return;
    }

    if (!localUser || cloudUser || isMigratingLocalUserRef.current) {
      return;
    }

    isMigratingLocalUserRef.current = true;
    (async () => {
      try {
        await migrateLocalUserToCloud();
      } catch (error) {
        showErrorSnackbar(error);
      } finally {
        isMigratingLocalUserRef.current = false;
      }
    })();
  }, [userId, memberPlan, localUser, cloudUser]);

  // You cannot refresh the page in Tauri, here's a hotkey to help with that
  useKeyDownHandler({
    keys: ["r"],
    ctrl: true,
    callback: () => {
      if (getIsDevMode()) {
        showSnackbar("Refreshing application...");
        window.location.href = "/welcome";
      }
    },
  });

  // Hotkey to open settings (Cmd+, on macOS)
  useKeyDownHandler({
    keys: [","],
    meta: true,
    callback: () => {
      if (window.location.pathname !== "/dashboard/settings") {
        window.location.href = "/dashboard/settings";
      }
    },
  });

  return null;
};
