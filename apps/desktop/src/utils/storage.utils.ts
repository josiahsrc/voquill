import type { AppState } from "../state/app.state";

const APP_ICON_DIRECTORY = "app-icons";
const APP_ICON_EXTENSION = ".png";
const FALLBACK_USER_ID = "unknown-user";

export const buildAppIconPath = (state: AppState, targetId: string): string => {
  const userId = state.auth?.uid ?? FALLBACK_USER_ID;
  return `${userId}/${APP_ICON_DIRECTORY}/${targetId}${APP_ICON_EXTENSION}`;
};

export const decodeBase64Icon = (value: string): Uint8Array => {
  const decoder = globalThis.atob;
  if (typeof decoder !== "function") {
    return new Uint8Array();
  }

  const binary = decoder(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};
