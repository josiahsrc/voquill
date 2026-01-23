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

type CursorToViewportParams = {
  cursorX: number;
  cursorY: number;
  visibleX: number;
  visibleY: number;
  visibleHeight: number;
};

export const cursorToViewportPosition = (
  params: CursorToViewportParams,
): { x: number; y: number } => {
  const { cursorX, cursorY, visibleX, visibleY, visibleHeight } = params;
  const plt = getPlatform();

  const x = Math.round(cursorX - visibleX);

  if (plt === "macos") {
    // macOS: Screen coordinates have Y=0 at bottom, need to invert for viewport
    const y = Math.round(visibleHeight - (cursorY - visibleY));
    return { x, y };
  } else {
    // Windows/Linux: Screen coordinates have Y=0 at top, same as viewport
    const y = Math.round(cursorY - visibleY);
    return { x, y };
  }
};

export const getOverlayBottomOffset = (): number => {
  const plt = getPlatform();
  switch (plt) {
    case "macos":
      return 12;
    case "linux":
      return 13;
    case "windows":
      return 14;
    default:
      return 12;
  }
};

