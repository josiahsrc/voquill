import { ApiKey, ApiKeyProvider } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { BaseRepo } from "./base.repo";

type LocalApiKey = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  createdAt: number;
  keySuffix?: string | null;
  keyFull?: string | null;
  transcriptionModel?: string | null;
  postProcessingModel?: string | null;
};

const fromLocalApiKey = (apiKey: LocalApiKey): ApiKey => ({
  id: apiKey.id,
  name: apiKey.name,
  provider: apiKey.provider,
  createdAt: dayjs(apiKey.createdAt).toISOString(),
  keySuffix: apiKey.keySuffix ?? null,
  keyFull: apiKey.keyFull ?? null,
  transcriptionModel: apiKey.transcriptionModel ?? null,
  postProcessingModel: apiKey.postProcessingModel ?? null,
});

export type CreateApiKeyPayload = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  key: string;
};

export type UpdateApiKeyPayload = {
  id: string;
  transcriptionModel?: string | null;
  postProcessingModel?: string | null;
};

export abstract class BaseApiKeyRepo extends BaseRepo {
  abstract listApiKeys(): Promise<ApiKey[]>;
  abstract createApiKey(payload: CreateApiKeyPayload): Promise<ApiKey>;
  abstract updateApiKey(payload: UpdateApiKeyPayload): Promise<void>;
  abstract deleteApiKey(id: string): Promise<void>;
}

export class LocalApiKeyRepo extends BaseApiKeyRepo {
  async listApiKeys(): Promise<ApiKey[]> {
    const apiKeys = await invoke<LocalApiKey[]>("api_key_list");
    return apiKeys.map(fromLocalApiKey);
  }

  async createApiKey(payload: CreateApiKeyPayload): Promise<ApiKey> {
    const created = await invoke<LocalApiKey>("api_key_create", {
      apiKey: payload,
    });
    return fromLocalApiKey(created);
  }

  async updateApiKey(payload: UpdateApiKeyPayload): Promise<void> {
    await invoke<void>("api_key_update", { request: payload });
  }

  async deleteApiKey(id: string): Promise<void> {
    await invoke<void>("api_key_delete", { id });
  }
}
