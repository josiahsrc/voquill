import { invoke } from "@tauri-apps/api/core";
import { getPlatform } from "./platform.utils";
import type {
  PermissionKind,
  PermissionState,
  PermissionStatus,
} from "../types/permission.types";

export const REQUIRED_PERMISSIONS = [
  "microphone",
  "accessibility",
] as const satisfies readonly PermissionKind[];

export const ENHANCEMENT_PERMISSIONS = [
  "screen-recording",
] as const satisfies readonly PermissionKind[];

export const checkMicrophonePermission =
  async (): Promise<PermissionStatus> => {
    return invoke<PermissionStatus>("check_microphone_permission");
  };

export const requestMicrophonePermission =
  async (): Promise<PermissionStatus> => {
    return invoke<PermissionStatus>("request_microphone_permission");
  };

export const checkScreenRecordingPermission =
  async (): Promise<PermissionStatus> => {
    return {
      kind: "screen-recording",
      state: "not-determined",
      promptShown: false,
    };
  };

export const requestScreenRecordingPermission =
  async (): Promise<PermissionStatus> => {
    return {
      kind: "screen-recording",
      state: "not-determined",
      promptShown: false,
    };
  };

export const checkAccessibilityPermission =
  async (): Promise<PermissionStatus> => {
    return invoke<PermissionStatus>("check_accessibility_permission");
  };

export const requestAccessibilityPermission =
  async (): Promise<PermissionStatus> => {
    return invoke<PermissionStatus>("request_accessibility_permission");
  };

export const isPermissionAuthorized = (
  state: PermissionState | null | undefined,
): boolean => {
  return state === "authorized";
};

export const isPermissionDenied = (
  state: PermissionState | null | undefined,
): boolean => {
  return state === "denied";
};

export const isPermissionRestricted = (
  state: PermissionState | null | undefined,
): boolean => {
  return state === "restricted";
};

export const isPermissionRequestActionable = (
  kind: PermissionKind,
): boolean => {
  return kind !== "screen-recording";
};

export const getPermissionLabel = (kind: PermissionKind): string => {
  switch (kind) {
    case "microphone":
      return "Microphone access";
    case "accessibility":
      return "Accessibility";
    case "screen-recording":
      return "Screen recording";
    default:
      return kind;
  }
};

export const getPermissionInstructions = (kind: PermissionKind): string => {
  const platform = getPlatform();

  if (kind === "microphone") {
    if (platform === "macos") {
      return "System Settings → Privacy & Security → Microphone";
    }
    if (platform === "windows") {
      return "Settings → Privacy & security → Microphone";
    }
    return "Allow microphone access in your system audio settings.";
  }

  if (kind === "screen-recording") {
    return "Optional enhancement for future OCR and screen context support. It is not required to start Voquill today, and native setup arrives in a later update.";
  }

  if (platform === "macos") {
    return "System Settings → Privacy & Security → Accessibility";
  }
  if (platform === "windows") {
    return "No additional permission required on Windows.";
  }
  return "Allow accessibility access in your desktop environment settings.";
};

export const describePermissionState = (state: PermissionState): string => {
  switch (state) {
    case "authorized":
      return "Authorized";
    case "not-determined":
      return "Not granted yet";
    case "restricted":
      return "Restricted by system";
    case "denied":
    default:
      return "Not authorized";
  }
};
