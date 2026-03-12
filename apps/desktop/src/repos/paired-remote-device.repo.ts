import type { PairedRemoteDevice } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

export type PairedRemoteDeviceUpsertParams = {
  id: string;
  name: string;
  platform: PairedRemoteDevice["platform"];
  role: PairedRemoteDevice["role"];
  sharedSecret: string;
  pairedAt: string;
  lastSeenAt: string | null;
  lastKnownAddress: string | null;
  trusted: boolean;
};

export abstract class BasePairedRemoteDeviceRepo extends BaseRepo {
  abstract listPairedRemoteDevices(): Promise<PairedRemoteDevice[]>;
  abstract upsertPairedRemoteDevice(
    params: PairedRemoteDeviceUpsertParams,
  ): Promise<PairedRemoteDevice>;
}

export class LocalPairedRemoteDeviceRepo extends BasePairedRemoteDeviceRepo {
  async listPairedRemoteDevices(): Promise<PairedRemoteDevice[]> {
    return invoke<PairedRemoteDevice[]>("paired_remote_device_list");
  }

  async upsertPairedRemoteDevice(
    params: PairedRemoteDeviceUpsertParams,
  ): Promise<PairedRemoteDevice> {
    return invoke<PairedRemoteDevice>("paired_remote_device_upsert", {
      args: params,
    });
  }
}
