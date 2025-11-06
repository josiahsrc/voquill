import { firemix, FiremixResult, Nullable } from "@firemix/client";
import { mixpath } from "@repo/firemix";
import { Member, PartialConfig, User } from "@repo/types";
import { listify } from "@repo/utilities";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { combineLatest, Observable, of } from "rxjs";
import { showErrorSnackbar } from "../../actions/app.actions";
import { refreshCurrentUser } from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useKeyDownHandler } from "../../hooks/helper.hooks";
import { useStreamWithSideEffects } from "../../hooks/stream.hooks";
import { produceAppState, useAppStore } from "../../store";
import { AuthUser } from "../../types/auth.types";
import { registerMembers, registerUsers } from "../../utils/app.utils";
import { getIsDevMode } from "../../utils/env.utils";

type StreamRet = Nullable<
  [
    Nullable<FiremixResult<Member>>,
    Nullable<FiremixResult<User>>,
    Nullable<FiremixResult<PartialConfig>>,
  ]
>;

export const AppSideEffects = () => {
  const [authReady, setAuthReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [initReady, setInitReady] = useState(false);
  const userId = useAppStore((state) => state.auth?.uid ?? "");
  const initialized = useAppStore((state) => state.initialized);

  const onAuthStateChanged = (user: AuthUser | null) => {
    setAuthReady(true);
    produceAppState((draft) => {
      draft.auth = user;
      draft.initialized = false;
    });
  };

  useEffect(() => {
    return getAuth().onAuthStateChanged(onAuthStateChanged, (error) => {
      showErrorSnackbar(error);
      onAuthStateChanged(null);
    });
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
        firemix().watch(mixpath.members(userId)),
        firemix().watch(mixpath.users(userId)),
        firemix().watch(mixpath.systemConfig()),
      ]);
    },
    onSuccess: (results) => {
      setStreamReady(true);
      if (results === null) {
        return;
      }

      const [members, user, config] = results;
      produceAppState((draft) => {
        registerUsers(draft, listify(user?.data));
        registerMembers(draft, listify(members?.data));
        draft.config = config?.data ?? null;
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

  // You cannot refresh the page in Tauri, here's a hotkey to help with that
  useKeyDownHandler({
    keys: ["r"],
    ctrl: true,
    callback: () => {
      if (getIsDevMode()) {
        window.location.reload();
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
