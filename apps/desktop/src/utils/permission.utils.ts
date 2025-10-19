import { invoke } from "@tauri-apps/api/core";
import { getPlatform } from "./platform.utils";
import type {
  PermissionKind,
  PermissionState,
  PermissionStatus,
} from "../types/permission.types";

export const REQUIRED_PERMISSIONS: PermissionKind[] = [
  "microphone",
  "input-monitoring",
];

export const fetchMicrophonePermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("ensure_microphone_permission");
};

export const fetchInputMonitoringPermission = async (): Promise<PermissionStatus> => {
  return invoke<PermissionStatus>("ensure_input_monitor_permission");
};

export const isPermissionAuthorized = (state: PermissionState): boolean => {
  return state === "authorized";
};

export const getPermissionLabel = (kind: PermissionKind): string => {
  switch (kind) {
    case "microphone":
      return "Microphone access";
    case "input-monitoring":
      return "Keyboard monitoring";
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
    return "System Settings → Privacy & Security → Input Monitoring";
  }
  if (platform === "windows") {
    return "Enable Voquill under Settings → Privacy & security → Keyboard.";
  }
  return "Enable global keyboard access in your desktop environment settings.";
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
