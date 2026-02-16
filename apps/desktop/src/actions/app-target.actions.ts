import { AppTarget, Nullable } from "@repo/types";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { getAppTargetRepo, getStorageRepo } from "../repos";
import { AppTargetUpsertParams } from "../repos/app-target.repo";
import { getAppState, produceAppState } from "../store";
import { registerAppTargets } from "../utils/app.utils";
import { normalizeAppTargetId } from "../utils/apptarget.utils";
import { getLogger } from "../utils/log.utils";
import { buildAppIconPath, decodeBase64Icon } from "../utils/storage.utils";
import { showErrorSnackbar } from "./app.actions";

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
      await getLogger().stopwatch("upsert_app_target", async () => {
        await upsertAppTarget({
          id: appTargetId,
          name: appName,
          toneId: existingApp?.toneId ?? null,
          iconPath: iconPath ?? existingApp?.iconPath ?? null,
          pasteKeybind: existingApp?.pasteKeybind ?? null,
        });
      });
    } catch (error) {
      console.error("Failed to upsert app target", error);
    }
  }

  return getRec(getAppState().appTargetById, appTargetId) ?? null;
};
