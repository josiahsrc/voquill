import { invoke } from "@tauri-apps/api/core";

import { BaseRepo } from "./base.repo";

export type StorageUploadData = Uint8Array | ArrayBuffer | number[];

export type StorageUploadInput = {
  path: string;
  data: StorageUploadData;
};

const normalizeData = (data: StorageUploadData): number[] => {
  if (data instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(data));
  }
  if (data instanceof Uint8Array) {
    return Array.from(data);
  }

  return data;
};

export abstract class BaseStorageRepo extends BaseRepo {
  abstract uploadData(args: StorageUploadInput): Promise<void>;
  abstract getDownloadUrl(path: string): Promise<string>;
}

export class LocalStorageRepo extends BaseStorageRepo {
  async uploadData({ path, data }: StorageUploadInput): Promise<void> {
    await invoke<void>("storage_upload_data", {
      args: {
        path,
        data: normalizeData(data),
      },
    });
  }

  async getDownloadUrl(path: string): Promise<string> {
    return invoke<string>("storage_get_download_url", { path });
  }
}
