import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";
import type { DesktopPlatform } from "./platform";

const GITHUB_RELEASE_DOWNLOAD_BASE =
  "https://github.com/voquill/voquill/releases/download";
const RELEASE_TAG_REGEX = /\/releases\/download\/([^/]+)\//;
const BETA_UPDATE_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export type AvailableUpdateInfo = {
  currentVersion: string;
  version: string;
  releaseDate: string | null;
  releaseNotes: string | null;
  manualInstallerUrl: string | null;
  requiresManualInstall: boolean;
};

export type UpdateDownloadCallbacks = {
  onDownloadStarted?: (totalBytes: number | null) => void;
  onDownloadProgress?: (
    downloadedBytes: number,
    totalBytes: number | null,
  ) => void;
  onInstalling?: () => void;
};

let availableUpdate: Update | null = null;

export const shouldSurfaceUpdate = (
  releaseDate: string | null,
  optInToBetaUpdates: boolean,
): boolean => {
  if (optInToBetaUpdates) {
    return true;
  }

  if (!releaseDate) {
    return true;
  }

  const parsed = new Date(releaseDate).getTime();
  if (Number.isNaN(parsed)) {
    return true;
  }

  return Date.now() - parsed >= BETA_UPDATE_DELAY_MS;
};

export const isReadOnlyFilesystemInstallError = (
  message: string | null | undefined,
): boolean => {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("read-only file system") ||
    normalized.includes("os error 30") ||
    normalized.includes("cross-device link") ||
    normalized.includes("os error 18")
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractReleaseTagFromRawJson = (
  rawJson: Record<string, unknown>,
): string | null => {
  const platforms = rawJson.platforms;
  if (!isRecord(platforms)) {
    return null;
  }

  for (const platform of Object.values(platforms)) {
    if (!isRecord(platform)) {
      continue;
    }
    const url = platform.url;
    if (typeof url !== "string") {
      continue;
    }

    const match = RELEASE_TAG_REGEX.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

export const buildManualMacInstallerUrl = (
  version: string,
  rawJson: Record<string, unknown>,
): string | null => {
  const releaseTag = extractReleaseTagFromRawJson(rawJson);
  if (!releaseTag) {
    return null;
  }

  const fileName = `Voquill_${version}_universal.pkg`;
  return `${GITHUB_RELEASE_DOWNLOAD_BASE}/${encodeURIComponent(releaseTag)}/${encodeURIComponent(fileName)}`;
};

/**
 * Probes the app install directory for writability via the
 * `check_app_location_writable` Tauri command. Non-macOS always returns
 * `true`. Probe failures are swallowed and default to `true` so a flaky
 * probe doesn't block the update flow.
 */
export const checkAppLocationWritable = async (
  platform: DesktopPlatform,
): Promise<boolean> => {
  if (platform !== "darwin") {
    return true;
  }
  try {
    return await invoke<boolean>("check_app_location_writable");
  } catch (error) {
    console.error("Failed to check app location writability", error);
    return true;
  }
};

/**
 * Checks for an update. On success the underlying `Update` handle is
 * retained internally so a follow-up `installAvailableUpdate()` call can
 * drive the install; returns `null` when the app is already current. Throws
 * on network / plugin failures — callers should catch to surface.
 */
export const checkForUpdate = async (
  platform: DesktopPlatform,
): Promise<AvailableUpdateInfo | null> => {
  const update = await check();

  if (!update) {
    await closeAvailableUpdate();
    return null;
  }

  if (availableUpdate && availableUpdate !== update) {
    try {
      await availableUpdate.close();
    } catch (error) {
      console.error("Failed to close previous update resource", error);
    }
  }
  availableUpdate = update;

  const requiresManualInstall =
    platform === "darwin" ? !(await checkAppLocationWritable(platform)) : false;

  return {
    currentVersion: update.currentVersion,
    version: update.version,
    releaseDate: update.date ?? null,
    releaseNotes: update.body ?? null,
    manualInstallerUrl:
      platform === "darwin"
        ? buildManualMacInstallerUrl(update.version, update.rawJson)
        : null,
    requiresManualInstall,
  };
};

/** Releases the stored `Update` handle, if any. */
export const closeAvailableUpdate = async (): Promise<void> => {
  if (!availableUpdate) {
    return;
  }
  try {
    await availableUpdate.close();
  } catch (error) {
    console.error("Failed to close update resource", error);
  } finally {
    availableUpdate = null;
  }
};

/** True when `checkForUpdate` found and retained an update. */
export const hasAvailableUpdate = (): boolean => availableUpdate !== null;

/**
 * Downloads and installs using the `Update` handle retained from the last
 * `checkForUpdate()`. Callbacks drive the caller's own progress UI. Throws
 * when no handle is available or the install fails — on macOS, callers
 * should catch `isReadOnlyFilesystemInstallError(err)` and fall back to
 * `downloadAndOpenMacInstaller`.
 */
export const installAvailableUpdate = async (
  callbacks?: UpdateDownloadCallbacks,
): Promise<void> => {
  const update = availableUpdate;
  if (!update) {
    throw new Error("No available update to install");
  }

  let downloadedBytes = 0;
  let totalBytes: number | null = null;

  const handleEvent = (event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        totalBytes = event.data.contentLength ?? null;
        callbacks?.onDownloadStarted?.(totalBytes);
        break;
      case "Progress":
        downloadedBytes += event.data.chunkLength;
        callbacks?.onDownloadProgress?.(downloadedBytes, totalBytes);
        break;
      case "Finished":
        callbacks?.onInstalling?.();
        break;
      default:
        break;
    }
  };

  await update.downloadAndInstall(handleEvent);
};

/**
 * Downloads a `.pkg` installer to a temp directory and opens it via macOS
 * Installer.app. Used as a fallback when the in-place updater cannot write
 * to the app's install location.
 */
export const downloadAndOpenMacInstaller = async (
  url: string,
): Promise<void> => {
  await invoke("download_and_open_mac_installer", { url });
};

/** Relaunches the app via Tauri's process plugin. */
export const relaunchApp = async (): Promise<void> => {
  await relaunch();
};
