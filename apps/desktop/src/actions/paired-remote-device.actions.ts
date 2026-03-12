import type { PairedRemoteDevice } from "@repo/types";
import { getPairedRemoteDeviceRepo } from "../repos";
import type { PairedRemoteDeviceUpsertParams } from "../repos/paired-remote-device.repo";
import { produceAppState } from "../store";
import { registerPairedRemoteDevices } from "../utils/app.utils";

export const loadPairedRemoteDevices = async (): Promise<void> => {
  const devices = await getPairedRemoteDeviceRepo().listPairedRemoteDevices();

  produceAppState((draft) => {
    registerPairedRemoteDevices(draft, devices);
  });
};

export const upsertPairedRemoteDevice = async (
  params: PairedRemoteDeviceUpsertParams,
): Promise<PairedRemoteDevice> => {
  const device = await getPairedRemoteDeviceRepo().upsertPairedRemoteDevice(
    params,
  );

  produceAppState((draft) => {
    registerPairedRemoteDevices(draft, [device]);
  });

  return device;
};
