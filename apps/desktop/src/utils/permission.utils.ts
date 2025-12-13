import { invoke } from "@tauri-apps/api/core";
import { getPlatform } from "./platform.utils";
import type {
  PermissionKind,
  PermissionState,
  PermissionStatus,
} from "../types/permission.types";

export const REQUIRED_PERMISSIONS: PermissionKind[] = [
  "microphone",
  "accessibility",
];

export const checkMicrophonePermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("check_microphone_permission");
};

export const requestMicrophonePermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("request_microphone_permission");
};

export const checkAccessibilityPermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("check_accessibility_permission");
};

export const requestAccessibilityPermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("request_accessibility_permission");
};

export const isPermissionAuthorized = (state: PermissionState | null | undefined): boolean => {
  return state === "authorized";
};

export const getPermissionLabel = (kind: PermissionKind): string => {
  switch (kind) {
    case "microphone":
      return "Microphone access";
    case "accessibility":
      return "Accessibility";
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
      return "Awaiting approval";
    case "restricted":
      return "Restricted by system";
    case "denied":
    default:
      return "Not authorized";
  }
};
