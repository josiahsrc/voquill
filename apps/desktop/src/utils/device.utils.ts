import type { PairedRemoteDevice, RemoteOutputPreferences } from "@voquill/types";
import type { AppState } from "../state/app.state";

export const getPairedRemoteDeviceById = (
  state: AppState,
  deviceId: string | null,
): PairedRemoteDevice | null => {
  if (!deviceId) {
    return null;
  }

  return state.pairedRemoteDeviceById[deviceId] ?? null;
};

export const listPairedRemoteDevices = (
  state: AppState,
): PairedRemoteDevice[] => {
  return Object.values(state.pairedRemoteDeviceById).sort((left, right) =>
    right.pairedAt.localeCompare(left.pairedAt),
  );
};

export const getRemoteOutputPreferences = (
  state: AppState,
): RemoteOutputPreferences => {
  return {
    remoteOutputEnabled: state.userPrefs?.remoteOutputEnabled ?? false,
    remoteTargetDeviceId: state.userPrefs?.remoteTargetDeviceId ?? null,
  };
};

export const getRemoteReceiverStatus = (
  state: AppState,
): AppState["remoteReceiverStatus"] => {
  return state.remoteReceiverStatus;
};

export const getActiveRemoteTarget = (
  state: AppState,
): PairedRemoteDevice | null => {
  const prefs = getRemoteOutputPreferences(state);
  return getPairedRemoteDeviceById(state, prefs.remoteTargetDeviceId);
};
