import { relaunch } from "@tauri-apps/plugin-process";
import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";
import { getIntl } from "../i18n/intl";
import { getAppState, produceAppState } from "../store";
import { daysToMilliseconds } from "../utils/time.utils";
import { getMyUserPreferences } from "../utils/user.utils";
import { markSurfaceWindowForNextLaunch } from "../utils/window.utils";
import { showErrorSnackbar } from "./app.actions";
import { showToast } from "./toast.actions";

let availableUpdate: Update | null = null;
let checkingPromise: Promise<void> | null = null;
let installingPromise: Promise<void> | null = null;

const isBusy = () => {
  const { status } = getAppState().updater;
  return status === "downloading" || status === "installing";
};

export const checkForAppUpdates = async (): Promise<void> => {
  if (checkingPromise || isBusy()) {
    return checkingPromise ?? Promise.resolve();
  }

  const run = async () => {
    produceAppState((draft) => {
      draft.updater.status = "checking";
      draft.updater.errorMessage = null;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = null;
      draft.updater.totalBytes = null;
    });

    let update: Update | null;
    try {
      update = await check();
    } catch (error) {
      console.error("Failed to check for updates", error);
      const message =
        error instanceof Error ? error.message : "Unable to check for updates.";
      produceAppState((draft) => {
        draft.updater.status = "error";
        draft.updater.errorMessage = message;
      });
      return;
    }

    if (!update) {
      if (availableUpdate) {
        try {
          await availableUpdate.close();
        } catch (error) {
          console.error("Failed to close update resource", error);
        }
        availableUpdate = null;
      }

      produceAppState((draft) => {
        draft.updater.status = "idle";
        draft.updater.dialogOpen = false;
        draft.updater.availableVersion = null;
        draft.updater.currentVersion = null;
        draft.updater.releaseDate = null;
        draft.updater.releaseNotes = null;
        draft.updater.errorMessage = null;
        draft.updater.downloadProgress = null;
        draft.updater.downloadedBytes = null;
        draft.updater.totalBytes = null;
      });
      return;
    }

    if (availableUpdate) {
      try {
        await availableUpdate.close();
      } catch (error) {
        console.error("Failed to close previous update resource", error);
      }
    }

    availableUpdate = update;

    const state = getAppState();
    const { dialogOpen, dismissedUntil } = state.updater;
    const ignoreUpdateDialog =
      getMyUserPreferences(state)?.ignoreUpdateDialog ?? false;
    const shouldAutoShowDialog =
      !ignoreUpdateDialog &&
      !dialogOpen &&
      (!dismissedUntil || Date.now() >= dismissedUntil);

    produceAppState((draft) => {
      draft.updater.status = "ready";
      draft.updater.currentVersion = update.currentVersion;
      draft.updater.availableVersion = update.version;
      draft.updater.releaseDate = update.date ?? null;
      draft.updater.releaseNotes = update.body ?? null;
      draft.updater.errorMessage = null;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = null;
      draft.updater.totalBytes = null;
      if (shouldAutoShowDialog) {
        draft.updater.dialogOpen = true;
      }
    });

    if (shouldAutoShowDialog) {
      const intl = getIntl();
      await showToast({
        title: intl.formatMessage({
          defaultMessage: "New update available",
        }),
        message: intl.formatMessage(
          {
            defaultMessage: "Version {version} is ready to install.",
          },
          { version: update.version },
        ),
        toastType: "info",
        action: "surface_window",
        duration: 8_000,
      });
    }
  };

  checkingPromise = run();

  try {
    await checkingPromise;
  } finally {
    checkingPromise = null;
  }
};

export const openUpdateDialog = async (): Promise<void> => {
  if (availableUpdate) {
    produceAppState((draft) => {
      draft.updater.dialogOpen = true;
      draft.updater.errorMessage = null;
    });
    return;
  }

  await checkForAppUpdates();
};

const THREE_DAYS_MS = daysToMilliseconds(3);

export const dismissUpdateDialog = (duration = THREE_DAYS_MS): void => {
  produceAppState((draft) => {
    draft.updater.dialogOpen = false;
    draft.updater.dismissedUntil = Date.now() + duration;
  });
};

export const installAvailableUpdate = async (): Promise<void> => {
  if (installingPromise) {
    return installingPromise;
  }

  const update = availableUpdate;
  if (!update) {
    return;
  }

  const run = async (): Promise<boolean> => {
    let downloadedBytes = 0;
    let totalBytes: number | null = null;
    let succeeded = false;

    produceAppState((draft) => {
      draft.updater.status = "downloading";
      draft.updater.errorMessage = null;
      draft.updater.dialogOpen = true;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = 0;
      draft.updater.totalBytes = null;
    });

    const handleDownloadEvent = (event: DownloadEvent) => {
      switch (event.event) {
        case "Started": {
          totalBytes = event.data.contentLength ?? null;
          produceAppState((draft) => {
            draft.updater.status = "downloading";
            draft.updater.totalBytes = totalBytes;
            draft.updater.downloadedBytes = 0;
            draft.updater.downloadProgress =
              totalBytes && totalBytes > 0 ? 0 : null;
          });
          break;
        }
        case "Progress": {
          downloadedBytes += event.data.chunkLength;
          const progress =
            totalBytes != null && totalBytes > 0
              ? Math.max(0, Math.min(1, downloadedBytes / totalBytes))
              : null;
          produceAppState((draft) => {
            draft.updater.downloadedBytes = downloadedBytes;
            draft.updater.downloadProgress = progress;
          });
          break;
        }
        case "Finished": {
          produceAppState((draft) => {
            draft.updater.status = "installing";
            draft.updater.downloadedBytes = totalBytes ?? downloadedBytes;
            draft.updater.downloadProgress =
              totalBytes != null ? 1 : draft.updater.downloadProgress;
          });
          break;
        }
        default:
          break;
      }
    };

    try {
      await update.downloadAndInstall(handleDownloadEvent);
      succeeded = true;
    } catch (error) {
      console.error("Failed to download or install update", error);
      const message =
        error instanceof Error ? error.message : "Failed to install update.";
      produceAppState((draft) => {
        draft.updater.status = "error";
        draft.updater.errorMessage = message;
        draft.updater.dialogOpen = true;
        draft.updater.downloadProgress = null;
        draft.updater.downloadedBytes = null;
        draft.updater.totalBytes = null;
      });
      showErrorSnackbar("Failed to install update. Please try again.");
      return false;
    }

    produceAppState((draft) => {
      draft.updater.status = "installing";
    });

    return succeeded;
  };

  installingPromise = run()
    .then(async (succeeded) => {
      if (!succeeded) {
        return;
      }
      markSurfaceWindowForNextLaunch();
      try {
        await availableUpdate?.close();
        await relaunch();
      } catch (error) {
        console.error("Failed to close update resource", error);
      } finally {
        availableUpdate = null;
      }
    })
    .finally(() => {
      installingPromise = null;
    });

  await installingPromise;
};
