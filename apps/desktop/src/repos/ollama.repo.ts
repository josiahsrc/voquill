import { fetch } from "@tauri-apps/plugin-http";
import { getOllamaHeaders } from "../utils/ollama.utils";
import { BaseRepo } from "./base.repo";

export abstract class BaseOllamaRepo extends BaseRepo {
  abstract checkAvailability(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;
}

export class OllamaRepo extends BaseOllamaRepo {
  private ollamaUrl: string;
  private apiKey?: string;

  constructor(ollamaUrl: string, apiKey?: string) {
    super();
    this.ollamaUrl = ollamaUrl;
    this.apiKey = apiKey;
  }

  override async checkAvailability(): Promise<boolean> {
    try {
      const health = await fetch(`${this.ollamaUrl}`, {
        headers: getOllamaHeaders(this.apiKey),
      });
      return health.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await fetch(new URL("/api/tags", this.ollamaUrl).href, {
      headers: getOllamaHeaders(this.apiKey),
    });
    if (!response.ok) {
      throw new Error(
        `Unable to fetch Ollama models (status ${response.status})`,
      );
    }

    const payload = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };

    if (!payload.models) {
      return [];
    }

    return payload.models
      .map((model) => (model.name ?? "").trim())
      .filter((name): name is string => Boolean(name));
  }
}
