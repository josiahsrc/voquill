import { loadApiKeys } from "../../actions/api-key.actions";
import {
  loadAppTargets,
  tryRegisterCurrentAppTarget,
} from "../../actions/app-target.actions";
import { loadDictionary } from "../../actions/dictionary.actions";
import { loadHotkeys } from "../../actions/hotkey.actions";
import {
  handleEnterpriseOidcPayload,
  handleGoogleAuthPayload,
} from "../../actions/login.actions";
import { refreshMember } from "../../actions/member.actions";
import { syncAutoLaunchSetting } from "../../actions/settings.actions";
import { loadTones } from "../../actions/tone.actions";
import { loadTools } from "../../actions/tool.actions";
import {
  migratePreferredMicrophoneToPreferences,
  refreshCurrentUser,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { useAppStore } from "../../store";
import { REGISTER_CURRENT_APP_EVENT } from "../../types/app-target.types";
import type { EnterpriseOidcPayload } from "../../types/enterprise-oidc.types";
import { ENTERPRISE_OIDC_EVENT } from "../../types/enterprise-oidc.types";
import type { GoogleAuthPayload } from "../../types/google-auth.types";
import { GOOGLE_AUTH_EVENT } from "../../types/google-auth.types";
import { getLogger } from "../../utils/log.utils";
import { minutesToMilliseconds } from "../../utils/time.utils";

export const RootSideEffects = () => {
  const userId = useAppStore((state) => state.auth?.uid);

  useAsyncEffect(async () => {
    getLogger().info(`Loading user data (userId=${userId ?? "none"})`);
    await Promise.allSettled([refreshMember(), refreshCurrentUser()]);

    getLogger().verbose(
      "Loading hotkeys, API keys, dictionary, tones, app targets",
    );
    const loaders: Promise<unknown>[] = [
      loadHotkeys(),
      loadApiKeys(),
      loadDictionary(),
      loadTones(),
      loadAppTargets(),
      loadTools(),
      migratePreferredMicrophoneToPreferences(),
    ];
    await Promise.allSettled(loaders);
    getLogger().info("Initial data load complete");
  }, [userId]);

  useIntervalAsync(
    minutesToMilliseconds(15),
    async () => {
      await Promise.allSettled([refreshMember(), refreshCurrentUser()]);
    },
    [],
  );

  useAsyncEffect(async () => {
    await syncAutoLaunchSetting();
  }, []);

  useTauriListen<void>(REGISTER_CURRENT_APP_EVENT, async () => {
    await tryRegisterCurrentAppTarget();
  });

  useTauriListen<GoogleAuthPayload>(GOOGLE_AUTH_EVENT, (payload) =>
    handleGoogleAuthPayload(payload),
  );

  useTauriListen<EnterpriseOidcPayload>(ENTERPRISE_OIDC_EVENT, (payload) =>
    handleEnterpriseOidcPayload(payload),
  );

  return null;
};
