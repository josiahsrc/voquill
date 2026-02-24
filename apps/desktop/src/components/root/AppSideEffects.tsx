import {
  EnterpriseConfig,
  EnterpriseLicense,
  Member,
  Nullable,
  User,
} from "@repo/types";
import { listify } from "@repo/utilities";
import { getVersion } from "@tauri-apps/api/app";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { combineLatest, from, Observable, of } from "rxjs";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  migrateLocalUserToCloud,
  refreshCurrentUser,
} from "../../actions/user.actions";
import { useAsyncData, useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync, useKeyDownHandler } from "../../hooks/helper.hooks";
import { useStreamWithSideEffects } from "../../hooks/stream.hooks";
import { detectLocale } from "../../i18n";
import {
  getAuthRepo,
  getConfigRepo,
  getEnterpriseRepo,
  getMemberRepo,
  getUserRepo,
} from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { AuthUser } from "../../types/auth.types";
import { CURRENT_COHORT, getMixpanel } from "../../utils/analytics.utils";
import { registerMembers, registerUsers } from "../../utils/app.utils";
import {
  getEnterpriseTarget,
  invokeEnterprise,
  loadEnterpriseTarget,
} from "../../utils/enterprise.utils";
import { getIsDevMode } from "../../utils/env.utils";
import { getLogger } from "../../utils/log.utils";
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

// 5 minutes
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// 60 seconds
const ENTERPRISE_REFRESH_INTERVAL_MS = 1000 * 60;

export const AppSideEffects = () => {
  const [authReady, setAuthReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [initReady, setInitReady] = useState(false);
  const [enterpriseReady, setEnterpriseReady] = useState(false);
  const tokensRefreshedRef = useRef(false);
  const authReadyRef = useRef(false);
  const isEnterprise = useAppStore((state) => state.isEnterprise);
  const versionData = useAsyncData(getVersion, []);
  const allowDevTools = useAppStore(
    (state) => state.enterpriseConfig?.allowDevTools ?? true,
  );
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
    getLogger().info(`Auth state changed (uid=${user?.uid ?? "none"})`);
    authReadyRef.current = true;
    setAuthReady(true);
    produceAppState((draft) => {
      draft.auth = user;
      draft.initialized = false;
    });
  };

  useEffect(() => {
    if (allowDevTools) {
      return;
    }

    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [isEnterprise, allowDevTools]);

  useEffect(() => {
    authReadyRef.current = false;

    const timeoutId = setTimeout(() => {
      if (!authReadyRef.current) {
        getLogger().warning("Auth timed out, proceeding without auth");
        onAuthStateChanged(null);
      }
    }, AUTH_READY_TIMEOUT_MS);

    const unsubscribe = getAuthRepo().onAuthStateChanged(
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
  }, [isEnterprise]);

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

  useIntervalAsync(ENTERPRISE_REFRESH_INTERVAL_MS, async () => {
    getLogger().verbose("Loading enterprise target");
    const debugInfo = await loadEnterpriseTarget();

    getLogger().verbose(
      "Enterprise target reloaded from",
      debugInfo,
      getEnterpriseTarget(),
    );

    let config: Nullable<EnterpriseConfig> = null;
    let license: Nullable<EnterpriseLicense> = null;
    let isEnterprise = false;

    const repo = getEnterpriseRepo();
    if (repo) {
      isEnterprise = true;
      [config, license] = await repo.getConfig().catch((e) => {
        getLogger().error(`Failed to refresh enterprise config: ${e}`);
        return [null, null];
      });
    }

    const oidcProviders = isEnterprise
      ? await invokeEnterprise("oidcProvider/listEnabled", {})
          .then((res) => res.providers)
          .catch(() => [])
      : [];

    produceAppState((draft) => {
      draft.enterpriseConfig = config;
      draft.enterpriseLicense = license;
      draft.isEnterprise = isEnterprise;
      draft.oidcProviders = oidcProviders;
    });

    if (!tokensRefreshedRef.current) {
      tokensRefreshedRef.current = true;
      await getAuthRepo().refreshTokens();
    }

    setEnterpriseReady(true);
  }, []);

  useIntervalAsync(TOKEN_REFRESH_INTERVAL_MS, async () => {
    await getAuthRepo().refreshTokens();
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
    dependencies: [userId, authReady, isEnterprise],
  });

  useAsyncEffect(async () => {
    if (authReady) {
      await refreshCurrentUser();
      setInitReady(true);
    }
  }, [authReady, isEnterprise]);

  useEffect(() => {
    if (streamReady && initReady && !initialized && enterpriseReady) {
      getLogger().info("App fully initialized");
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
    getLogger().info("Migrating local user to cloud");
    (async () => {
      try {
        await migrateLocalUserToCloud();
        getLogger().info("Local user migrated to cloud successfully");
      } catch (error) {
        getLogger().error(`Failed to migrate local user to cloud: ${error}`);
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

    const mp = getMixpanel();
    if (!mp) {
      return;
    }

    const currentUserId = auth?.uid ?? null;
    const prevUserId = prevUserIdRef.current;
    if (prevUserId && !currentUserId) {
      mp.reset();
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
      mp.identify(currentUserId);

      mp.people.set_once({
        $created: new Date().toISOString(),
        initialPlatform: platform,
        initialLocale: locale,
        initialCohort: CURRENT_COHORT,
      });

      mp.register_once({
        initialPlatform: platform,
        initialLocale: locale,
        initialCohort: CURRENT_COHORT,
      });
    }

    mp.people.set({
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
      company: cloudUser?.company ?? undefined,
      title: cloudUser?.title ?? undefined,
    });

    mp.register({
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

    if (versionData.state === "success") {
      mp.register({
        appVersion: versionData.data,
      });
    }

    prevUserIdRef.current = currentUserId;
  }, [initialized, auth, member, cloudUser, localUser, prefs, versionData]);

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
