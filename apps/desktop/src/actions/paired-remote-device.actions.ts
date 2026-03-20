import type { PairedRemoteDevice } from "@repo/types";
import { getPairedRemoteDeviceRepo } from "../repos";
import type { PairedRemoteDeviceUpsertParams } from "../repos/paired-remote-device.repo";
import { getAppState, produceAppState } from "../store";
import { registerPairedRemoteDevices } from "../utils/app.utils";
import { getMyUserPreferences } from "../utils/user.utils";
import { setRemoteTargetDeviceId } from "./user.actions";

export const loadPairedRemoteDevices = async (): Promise<void> => {
  const devices = await getPairedRemoteDeviceRepo().listPairedRemoteDevices();

  produceAppState((draft) => {
    registerPairedRemoteDevices(draft, devices);
  });
};

export const upsertPairedRemoteDevice = async (
  params: PairedRemoteDeviceUpsertParams,
): Promise<PairedRemoteDevice> => {
  const device =
    await getPairedRemoteDeviceRepo().upsertPairedRemoteDevice(params);

  produceAppState((draft) => {
    registerPairedRemoteDevices(draft, [device]);
  });

  return device;
};

export const deletePairedRemoteDevice = async (id: string): Promise<void> => {
  const remoteTargetDeviceId =
    getMyUserPreferences(getAppState())?.remoteTargetDeviceId ?? null;

  await getPairedRemoteDeviceRepo().deletePairedRemoteDevice(id);

  produceAppState((draft) => {
    delete draft.pairedRemoteDeviceById[id];
  });

  if (remoteTargetDeviceId === id) {
    await setRemoteTargetDeviceId(null);
  }
};
