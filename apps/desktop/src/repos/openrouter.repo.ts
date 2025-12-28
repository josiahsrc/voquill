import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  openrouterFetchModels,
  openrouterTestIntegration,
} from "@repo/voice-ai";
import type { OpenRouterModel } from "@repo/types";
import { BaseRepo } from "./base.repo";

export abstract class BaseOpenRouterRepo extends BaseRepo {
  abstract fetchModels(): Promise<OpenRouterModel[]>;
  abstract testConnection(): Promise<boolean>;
}

export class OpenRouterRepo extends BaseOpenRouterRepo {
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<OpenRouterModel[]> {
    const result = await openrouterFetchModels({
      apiKey: this.apiKey,
      customFetch: tauriFetch,
    });
    return result.models;
  }

  async testConnection(): Promise<boolean> {
    try {
      return await openrouterTestIntegration({
        apiKey: this.apiKey,
        customFetch: tauriFetch,
      });
    } catch {
      return false;
    }
  }
}

export const getOpenRouterRepo = (apiKey: string): BaseOpenRouterRepo => {
  return new OpenRouterRepo(apiKey);
};
