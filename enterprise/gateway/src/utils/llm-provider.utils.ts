import type { BaseLlmApi } from "../apis/llm.api";
import {
  GroqLlmApi,
  OllamaLlmApi,
  OpenRouterLlmApi,
  SyntheticAiLlmApi,
} from "../apis/llm.api";
import type { LlmProviderRow } from "../types/llm-provider.types";
import { decryptApiKey } from "./crypto.utils";
import { getEncryptionSecret } from "./env.utils";

export function createLlmApi(row: LlmProviderRow): BaseLlmApi {
  const apiKey = row.api_key_encrypted
    ? decryptApiKey(row.api_key_encrypted, getEncryptionSecret())
    : "";

  switch (row.provider) {
    case "groq":
      return new GroqLlmApi({ apiKey, model: row.model });
    case "synthetic-ai":
      return new SyntheticAiLlmApi({ apiKey, model: row.model });
    case "open-router":
      return new OpenRouterLlmApi({ apiKey, model: row.model });
    default:
      return new OllamaLlmApi({
        url: row.url,
        apiKey: apiKey || "ollama",
        model: row.model,
      });
  }
}
