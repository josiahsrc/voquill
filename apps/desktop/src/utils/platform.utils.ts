import { platform } from "@tauri-apps/plugin-os";

export type Platform = "macos" | "windows" | "linux" | "unknown";

let cachedPlatform: Platform | null = null;

export const getPlatform = (): Platform => {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  const platformName = platform();
  switch (platformName) {
    case "macos":
      cachedPlatform = "macos";
      break;
    case "windows":
      cachedPlatform = "windows";
      break;
    case "linux":
      cachedPlatform = "linux";
      break;
    default:
      cachedPlatform = "unknown";
      break;
  }

  return cachedPlatform;
};
