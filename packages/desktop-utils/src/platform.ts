export type DesktopPlatform = "darwin" | "win32" | "linux";

/**
 * Best-effort platform detection from `navigator.userAgent`. Works in any
 * browser or Tauri webview. `navigator.platform` is deprecated so we avoid
 * it. Consumers that need a build-time override should layer one on top —
 * this helper has no knowledge of environment variables or build tooling.
 */
export const detectDesktopPlatform = (): DesktopPlatform => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) {
    return "darwin";
  }
  if (userAgent.includes("win")) {
    return "win32";
  }
  return "linux";
};
