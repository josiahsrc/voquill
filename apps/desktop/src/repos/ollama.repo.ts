import { fetch } from "@tauri-apps/plugin-http";
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

  private getHeaders(): HeadersInit | undefined {
    if (!this.apiKey) {
      return undefined;
    }
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  override async checkAvailability(): Promise<boolean> {
    try {
      const health = await fetch(`${this.ollamaUrl}`, {
        headers: this.getHeaders(),
      });
      return health.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Hitting the Ollama tags endpoint mirrors the `ollama list` CLI call.
    const response = await fetch(new URL("/api/tags", this.ollamaUrl).href, {
      headers: this.getHeaders(),
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
