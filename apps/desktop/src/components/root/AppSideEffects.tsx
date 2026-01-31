import { Member, Nullable, User } from "@repo/types";
import { listify } from "@repo/utilities";
import dayjs from "dayjs";
import mixpanel from "mixpanel-browser";
import { useEffect, useRef, useState } from "react";
import { combineLatest, from, Observable, of } from "rxjs";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  migrateLocalUserToCloud,
  refreshCurrentUser,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync, useKeyDownHandler } from "../../hooks/helper.hooks";
import { useStreamWithSideEffects } from "../../hooks/stream.hooks";
import { detectLocale } from "../../i18n";
import { produceAppState, useAppStore } from "../../store";
import { AuthUser } from "../../types/auth.types";
import { CURRENT_COHORT } from "../../utils/analytics.utils";
import { getConfigRepo, getMemberRepo, getUserRepo } from "../../repos";
import { registerMembers, registerUsers } from "../../utils/app.utils";
import { getEffectiveAuth } from "../../utils/auth.utils";
import {
  getEnterpriseConfig,
  loadEnterpriseConfig,
} from "../../utils/enterprise.utils";
import { getIsDevMode } from "../../utils/env.utils";
import { getPlatform } from "../../utils/platform.utils";
import {
  getEffectivePillVisibility,
  getMyUserPreferences,
  LOCAL_USER_ID,
} from "../../utils/user.utils";

type StreamRet = Nullable<[Nullable<Member>, Nullable<User>]>;

// Timeout for Firebase Auth initialization (handles cases where IndexedDB hangs on some Linux systems)
const AUTH_READY_TIMEOUT_MS = 4_000;

// 10 minutes
const CONFIG_REFRESH_INTERVAL_MS = 1000 * 60 * 10;

// 60 seconds
const ENTERPRISE_CONFIG_REFRESH_INTERVAL_MS = 1000 * 60;

export const AppSideEffects = () => {
  const [authReady, setAuthReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [initReady, setInitReady] = useState(false);
  const [enterpriseReady, setEnterpriseReady] = useState(false);
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
  const prefs = useAppStore((state) => getMyUserPreferences(state));

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

    const unsubscribe = getEffectiveAuth().onAuthStateChanged(
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

  useIntervalAsync(CONFIG_REFRESH_INTERVAL_MS, async () => {
    const config = await getConfigRepo()
      .getFullConfig()
      .catch(() => null);

    if (config) {
      produceAppState((draft) => {
        draft.config = config;
      });
    }
  }, []);

  useIntervalAsync(ENTERPRISE_CONFIG_REFRESH_INTERVAL_MS, async () => {
    await loadEnterpriseConfig();
    const config = getEnterpriseConfig();
    produceAppState((draft) => {
      draft.enterprise.gatewayUrl = config?.gatewayUrl ?? null;
    });
    setEnterpriseReady(true);
  }, []);

  useStreamWithSideEffects({
    builder: (): Observable<StreamRet> => {
      if (!authReady) {
        return of(null);
      }

      if (!userId) {
        return combineLatest([of(null), of(null)]);
      }

      return combineLatest([
        from(
          getMemberRepo()
            .getMyMember()
            .catch(() => null),
        ),
        from(
          getUserRepo()
            .getMyUser()
            .catch(() => null),
        ),
      ]);
    },
    onSuccess: (results) => {
      setStreamReady(true);
      if (results === null) {
        return;
      }

      const [members, user] = results;
      produceAppState((draft) => {
        registerUsers(draft, listify(user));
        registerMembers(draft, listify(members));
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
    if (streamReady && initReady && !initialized && enterpriseReady) {
      produceAppState((draft) => {
        draft.initialized = true;
      });
    }
  }, [streamReady, initReady, initialized, enterpriseReady]);

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

  const auth = useAppStore((state) => state.auth);
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialized) {
      return;
    }

    const currentUserId = auth?.uid ?? null;
    const prevUserId = prevUserIdRef.current;
    if (prevUserId && !currentUserId) {
      mixpanel.reset();
    }

    const isPro = member?.plan === "pro";
    const isFree = member?.plan === "free";
    const isCommunity = !currentUserId;
    const isTrial = member?.isOnTrial ?? false;
    const isPaying = !isTrial && isPro;
    const onboardedAt = cloudUser?.onboardedAt ?? localUser?.onboardedAt;
    const daysSinceOnboarded = onboardedAt
      ? dayjs().diff(dayjs(onboardedAt), "day")
      : 0;
    const platform = getPlatform();
    const locale = detectLocale();
    const onboarded = cloudUser?.onboarded ?? localUser?.onboarded ?? false;
    const planStatus = member?.plan ?? "community";

    if (currentUserId && currentUserId !== prevUserId) {
      mixpanel.identify(currentUserId);

      // Set creation time to ISO 8601 (2024-01-01T12:00:00.000Z) for Mixpanel
      mixpanel.people.set_once({
        $created: new Date().toISOString(),
        initialPlatform: platform,
        initialLocale: locale,
        initialCohort: CURRENT_COHORT,
      });

      mixpanel.register_once({
        initialPlatform: platform,
        initialLocale: locale,
        initialCohort: CURRENT_COHORT,
      });
    }

    mixpanel.people.set({
      $email: auth?.email ?? undefined,
      $name: auth?.displayName ?? undefined,
      planStatus,
      isPro,
      isFree,
      isCommunity,
      isTrial,
      isPaying,
      onboarded,
      onboardedAt: onboardedAt ?? undefined,
      activeSystemCohort: CURRENT_COHORT,
      daysSinceOnboarded,
      pillState: getEffectivePillVisibility(prefs?.dictationPillVisibility),
    });

    mixpanel.register({
      userId: currentUserId,
      planStatus,
      isPro,
      isFree,
      isCommunity,
      platform,
      locale,
      onboarded,
      daysSinceOnboarded,
      activeSystemCohort: CURRENT_COHORT,
      pillState: getEffectivePillVisibility(prefs?.dictationPillVisibility),
    });

    prevUserIdRef.current = currentUserId;
  }, [initialized, auth, member, cloudUser, localUser, prefs]);

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
