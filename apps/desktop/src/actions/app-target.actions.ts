import { invoke } from "@tauri-apps/api/core";
import { AppTarget, Nullable } from "@voquill/types";
import { getRec } from "@voquill/utilities";
import { getAppTargetRepo, getStorageRepo } from "../repos";
import { AppTargetUpsertParams } from "../repos/app-target.repo";
import { getAppState, produceAppState } from "../store";
import { registerAppTargets } from "../utils/app.utils";
import { normalizeAppTargetId } from "../utils/apptarget.utils";
import { getEffectiveStylingMode } from "../utils/feature.utils";
import { getLogger } from "../utils/log.utils";
import { buildAppIconPath, decodeBase64Icon } from "../utils/storage.utils";
import {
  getActiveManualToneIds,
  getManuallySelectedToneId,
} from "../utils/tone.utils";
import { getMyUserPreferences } from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import { setSelectedToneId } from "./user.actions";

export const loadAppTargets = async (): Promise<void> => {
  const targets = await getAppTargetRepo().listAppTargets();

  produceAppState((draft) => {
    registerAppTargets(draft, targets);
  });
};

export const upsertAppTarget = async (
  params: AppTargetUpsertParams,
): Promise<AppTarget> => {
  const target = await getAppTargetRepo().upsertAppTarget(params);

  produceAppState((draft) => {
    registerAppTargets(draft, [target]);
  });

  return target;
};

export const setAppTargetTone = async (
  id: string,
  toneId: string | null,
): Promise<void> => {
  const existing = getAppState().appTargetById[id];
  if (!existing) {
    showErrorSnackbar("App target is not registered.");
    return;
  }

  try {
    await upsertAppTarget({
      id,
      name: existing.name,
      toneId,
      iconPath: existing.iconPath ?? null,
      pasteKeybind: existing.pasteKeybind ?? null,
    });
  } catch (error) {
    console.error("Failed to update app target tone", error);
    showErrorSnackbar(
      error instanceof Error
        ? error.message
        : "Failed to update app target tone.",
    );
  }
};

export const setAppTargetPasteKeybind = async (
  id: string,
  pasteKeybind: string | null,
): Promise<void> => {
  const existing = getAppState().appTargetById[id];
  if (!existing) {
    showErrorSnackbar("App target is not registered.");
    return;
  }

  try {
    await upsertAppTarget({
      id,
      name: existing.name,
      toneId: existing.toneId ?? null,
      iconPath: existing.iconPath ?? null,
      pasteKeybind,
    });
  } catch (error) {
    console.error("Failed to update app target paste keybind", error);
    showErrorSnackbar(
      error instanceof Error
        ? error.message
        : "Failed to update app target paste keybind.",
    );
  }
};

type CurrentAppInfoResponse = {
  appName: string;
  iconBase64: string;
};

export const tryRegisterCurrentAppTarget = async (): Promise<
  Nullable<AppTarget>
> => {
  const appInfo = await getLogger().stopwatch("get_current_app_info", () =>
    invoke<CurrentAppInfoResponse>("get_current_app_info"),
  );

  const appName = appInfo.appName?.trim() ?? "";
  const appTargetId = normalizeAppTargetId(appName);
  const existingApp = getRec(getAppState().appTargetById, appTargetId);

  const shouldRegisterAppTarget = !existingApp || !existingApp.iconPath;
  if (shouldRegisterAppTarget) {
    let iconPath: string | undefined;
    if (appInfo.iconBase64) {
      const targetPath = buildAppIconPath(getAppState(), appTargetId);
      try {
        await getLogger().stopwatch("upload_app_icon", async () => {
          await getStorageRepo().uploadData({
            path: targetPath,
            data: decodeBase64Icon(appInfo.iconBase64),
          });
        });
        iconPath = targetPath;
      } catch (uploadError) {
        console.error("Failed to upload app icon", uploadError);
      }
    }

    try {
      const defaultPasteKeybind =
        getMyUserPreferences(getAppState())?.pasteKeybind ?? null;
      await getLogger().stopwatch("upsert_app_target", async () => {
        await upsertAppTarget({
          id: appTargetId,
          name: appName,
          toneId: existingApp?.toneId ?? null,
          iconPath: iconPath ?? existingApp?.iconPath ?? null,
          pasteKeybind: existingApp?.pasteKeybind ?? defaultPasteKeybind,
        });
      });
    } catch (error) {
      console.error("Failed to upsert app target", error);
    }
  }

  return getRec(getAppState().appTargetById, appTargetId) ?? null;
};

export const loadManualStyleForCurrentApp = async (): Promise<void> => {
  if (getEffectiveStylingMode(getAppState()) !== "manual") return;

  try {
    const appInfo = await invoke<{ appName: string }>("get_current_app_info");
    const appTargetId = normalizeAppTargetId(appInfo.appName?.trim() ?? "");
    const appTarget = getAppState().appTargetById[appTargetId];
    if (appTarget?.toneId) {
      const activeIds = getActiveManualToneIds(getAppState());
      if (activeIds.includes(appTarget.toneId)) {
        await setSelectedToneId(appTarget.toneId);
      }
    }
  } catch (error) {
    getLogger().verbose(`Failed to load app style: ${error}`);
  }
};

export const saveManualStyleForApp = (appTarget: AppTarget): void => {
  if (getEffectiveStylingMode(getAppState()) !== "manual") return;

  const manualToneId = getManuallySelectedToneId(getAppState());
  if (manualToneId !== (appTarget.toneId ?? null)) {
    setAppTargetTone(appTarget.id, manualToneId).catch((error) =>
      getLogger().verbose(`Failed to save app style: ${error}`),
    );
  }
};
