import { invoke } from "@tauri-apps/api/core";

const SURFACE_WINDOW_FLAG_KEY = "voquill:surface-main-window-on-launch";

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
