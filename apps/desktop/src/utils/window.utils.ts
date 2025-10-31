import { invoke } from "@tauri-apps/api/core";

const SURFACE_WINDOW_FLAG_KEY = "voquill:surface-main-window-on-launch";
const LAST_SURFACED_UPDATE_VERSION_KEY = "voquill:last-surfaced-update-version";

let surfaceWindowPromise: Promise<void> | null = null;

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error("Unable to access localStorage", error);
    return null;
  }
};

export const surfaceMainWindow = async (): Promise<void> => {
  if (!surfaceWindowPromise) {
    surfaceWindowPromise = invoke<void>("surface_main_window")
      .catch(async (error) => {
        console.error("Failed to surface main window via native command", error);
      })
      .finally(() => {
        surfaceWindowPromise = null;
      });
  }

  await surfaceWindowPromise;
};

export const markSurfaceWindowForNextLaunch = (): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SURFACE_WINDOW_FLAG_KEY, "1");
  } catch (error) {
    console.error("Failed to mark surface window flag", error);
  }
};

export const getLastSurfacedUpdateVersion = (): string | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(LAST_SURFACED_UPDATE_VERSION_KEY);
  } catch (error) {
    console.error("Failed to read last surfaced update version", error);
    return null;
  }
};

export const setLastSurfacedUpdateVersion = (version: string): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAST_SURFACED_UPDATE_VERSION_KEY, version);
  } catch (error) {
    console.error("Failed to persist last surfaced update version", error);
  }
};

export const consumeSurfaceWindowFlag = (): boolean => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    const value = storage.getItem(SURFACE_WINDOW_FLAG_KEY);
    storage.removeItem(SURFACE_WINDOW_FLAG_KEY);
    return value === "1";
  } catch (error) {
    console.error("Failed to read surface window flag", error);
    return false;
  }
};
