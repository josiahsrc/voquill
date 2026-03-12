import type { RemoteReceiverStatus } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

export abstract class BaseRemoteReceiverRepo extends BaseRepo {
  abstract getRemoteReceiverStatus(): Promise<RemoteReceiverStatus>;
  abstract startRemoteReceiver(
    port?: number | null,
  ): Promise<RemoteReceiverStatus>;
  abstract stopRemoteReceiver(): Promise<RemoteReceiverStatus>;
}

export class LocalRemoteReceiverRepo extends BaseRemoteReceiverRepo {
  async getRemoteReceiverStatus(): Promise<RemoteReceiverStatus> {
    return invoke<RemoteReceiverStatus>("remote_receiver_status");
  }

  async startRemoteReceiver(
    port?: number | null,
  ): Promise<RemoteReceiverStatus> {
    return invoke<RemoteReceiverStatus>("remote_receiver_start", {
      args: {
        port: port ?? null,
      },
    });
  }

  async stopRemoteReceiver(): Promise<RemoteReceiverStatus> {
    await invoke<void>("remote_receiver_stop");
    return this.getRemoteReceiverStatus();
  }
}
