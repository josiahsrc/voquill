import {
  checkForUpdate,
  closeAvailableUpdate,
  downloadAndOpenMacInstaller,
  hasAvailableUpdate,
  installAvailableUpdate as pkgInstallAvailableUpdate,
  isReadOnlyFilesystemInstallError,
  relaunchApp,
  shouldSurfaceUpdate,
} from "@voquill/desktop-utils";
import { getIntl } from "../i18n/intl";
import { getAppState, produceAppState } from "../store";
import { getPlatform } from "../utils/env.utils";
import { daysToMilliseconds } from "../utils/time.utils";
import { getMyUserPreferences } from "../utils/user.utils";
import { markSurfaceWindowForNextLaunch } from "../utils/window.utils";
import { showErrorSnackbar } from "./app.actions";
import { showToast } from "./toast.actions";

let checkingPromise: Promise<boolean> | null = null;
let installingPromise: Promise<void> | null = null;

const isBusy = () => {
  const { status } = getAppState().updater;
  return status === "downloading" || status === "installing";
};

export const checkForAppUpdates = async (): Promise<boolean> => {
  if (checkingPromise || isBusy()) {
    return checkingPromise ?? Promise.resolve(false);
  }

  const platform = getPlatform();

  const run = async (): Promise<boolean> => {
    produceAppState((draft) => {
      draft.updater.status = "checking";
      draft.updater.errorMessage = null;
      draft.updater.manualInstallerUrl = null;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = null;
      draft.updater.totalBytes = null;
    });

    let update: Awaited<ReturnType<typeof checkForUpdate>>;
    try {
      update = await checkForUpdate(platform);
    } catch (error) {
      console.error("Failed to check for updates", error);
      produceAppState((draft) => {
        draft.updater.status = "error";
        draft.updater.errorMessage = String(error);
        draft.updater.manualInstallerUrl = null;
      });
      return false;
    }

    if (!update) {
      produceAppState((draft) => {
        draft.updater.status = "idle";
        draft.updater.dialogOpen = false;
        draft.updater.availableVersion = null;
        draft.updater.currentVersion = null;
        draft.updater.releaseDate = null;
        draft.updater.releaseNotes = null;
        draft.updater.manualInstallerUrl = null;
        draft.updater.requiresManualInstall = false;
        draft.updater.errorMessage = null;
        draft.updater.downloadProgress = null;
        draft.updater.downloadedBytes = null;
        draft.updater.totalBytes = null;
      });
      return false;
    }

    const state = getAppState();
    const { dialogOpen, dismissedUntil } = state.updater;
    const ignoreUpdateDialog =
      getMyUserPreferences(state)?.ignoreUpdateDialog ?? false;
    const isUpdateSurfaced = shouldSurfaceUpdate(
      update.releaseDate,
      state.local.optInToBetaUpdates,
    );
    const shouldAutoShowDialog =
      isUpdateSurfaced &&
      !ignoreUpdateDialog &&
      !dialogOpen &&
      (!dismissedUntil || Date.now() >= dismissedUntil);

    produceAppState((draft) => {
      draft.updater.status = "ready";
      draft.updater.currentVersion = update.currentVersion;
      draft.updater.availableVersion = update.version;
      draft.updater.releaseDate = update.releaseDate;
      draft.updater.releaseNotes = update.releaseNotes;
      draft.updater.manualInstallerUrl = update.manualInstallerUrl;
      draft.updater.requiresManualInstall = update.requiresManualInstall;
      draft.updater.errorMessage = null;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = null;
      draft.updater.totalBytes = null;
      if (shouldAutoShowDialog) {
        draft.updater.dialogOpen = true;
      }
    });

    // It's hard to see the update menu icon on Linux and Windows, so show a
    // toast notification when an update is available. On macOS, the menu icon
    // is more visible and users are more accustomed to checking there for
    // updates, so we can skip the toast.
    if (shouldAutoShowDialog && platform !== "darwin") {
      const intl = getIntl();
      await showToast({
        message: intl.formatMessage(
          {
            defaultMessage: "Version {version} is ready to install",
          },
          { version: update.version },
        ),
        toastType: "info",
        action: "surface_window",
        duration: 8_000,
      });
    }

    return true;
  };

  checkingPromise = run();

  try {
    return await checkingPromise;
  } finally {
    checkingPromise = null;
  }
};

export const openUpdateDialog = async (): Promise<void> => {
  if (hasAvailableUpdate()) {
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

const installViaPkgInstaller = async (): Promise<boolean> => {
  const { manualInstallerUrl } = getAppState().updater;
  if (!manualInstallerUrl) {
    showErrorSnackbar("No installer package available for this version.");
    return false;
  }

  produceAppState((draft) => {
    draft.updater.status = "downloading";
    draft.updater.errorMessage = null;
    draft.updater.dialogOpen = true;
    draft.updater.downloadProgress = null;
    draft.updater.downloadedBytes = null;
    draft.updater.totalBytes = null;
  });

  try {
    await downloadAndOpenMacInstaller(manualInstallerUrl);
  } catch (error) {
    console.error("Failed to download or open pkg installer", error);
    produceAppState((draft) => {
      draft.updater.status = "error";
      draft.updater.errorMessage = String(error);
      draft.updater.dialogOpen = true;
      draft.updater.downloadProgress = null;
      draft.updater.downloadedBytes = null;
      draft.updater.totalBytes = null;
    });
    showErrorSnackbar("Failed to download the installer. Please try again.");
    return false;
  }

  produceAppState((draft) => {
    draft.updater.status = "installing";
  });

  return true;
};

const installViaBuiltInUpdater = async (): Promise<boolean> => {
  produceAppState((draft) => {
    draft.updater.status = "downloading";
    draft.updater.errorMessage = null;
    draft.updater.dialogOpen = true;
    draft.updater.downloadProgress = null;
    draft.updater.downloadedBytes = 0;
    draft.updater.totalBytes = null;
  });

  try {
    await pkgInstallAvailableUpdate({
      onDownloadStarted: (totalBytes) => {
        produceAppState((draft) => {
          draft.updater.status = "downloading";
          draft.updater.totalBytes = totalBytes;
          draft.updater.downloadedBytes = 0;
          draft.updater.downloadProgress =
            totalBytes && totalBytes > 0 ? 0 : null;
        });
      },
      onDownloadProgress: (downloadedBytes, totalBytes) => {
        const progress =
          totalBytes != null && totalBytes > 0
            ? Math.max(0, Math.min(1, downloadedBytes / totalBytes))
            : null;
        produceAppState((draft) => {
          draft.updater.downloadedBytes = downloadedBytes;
          draft.updater.downloadProgress = progress;
        });
      },
      onInstalling: () => {
        produceAppState((draft) => {
          draft.updater.status = "installing";
          const { totalBytes, downloadedBytes, downloadProgress } =
            draft.updater;
          draft.updater.downloadedBytes = totalBytes ?? downloadedBytes;
          draft.updater.downloadProgress =
            totalBytes != null ? 1 : downloadProgress;
        });
      },
    });
  } catch (error) {
    const errorMessage = String(error);
    const platform = getPlatform();
    const shouldUseManualInstaller =
      platform === "darwin" && isReadOnlyFilesystemInstallError(errorMessage);
    console.error("Failed to download or install update", error);

    if (shouldUseManualInstaller) {
      produceAppState((draft) => {
        draft.updater.requiresManualInstall = true;
      });
      return installViaPkgInstaller();
    }

    produceAppState((draft) => {
      draft.updater.status = "error";
      draft.updater.errorMessage = errorMessage;
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

  return true;
};

export const installAvailableUpdate = async (): Promise<void> => {
  if (installingPromise) {
    return installingPromise;
  }

  if (!hasAvailableUpdate()) {
    return;
  }

  const { requiresManualInstall } = getAppState().updater;

  const run = requiresManualInstall
    ? installViaPkgInstaller
    : installViaBuiltInUpdater;

  installingPromise = run()
    .then(async (succeeded) => {
      if (!succeeded) {
        return;
      }

      if (requiresManualInstall) {
        // The .pkg installer will replace the app externally; no relaunch
        // needed from here. Just release the stored update handle.
        await closeAvailableUpdate();
        return;
      }

      markSurfaceWindowForNextLaunch();
      await closeAvailableUpdate();
      try {
        await relaunchApp();
      } catch (error) {
        console.error("Failed to relaunch after update", error);
      }
    })
    .finally(() => {
      installingPromise = null;
    });

  await installingPromise;
};
