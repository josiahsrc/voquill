import type { BaseLlmApi } from "../apis/llm.api";
import { OllamaLlmApi } from "../apis/llm.api";
import type { LlmProviderRow } from "../types/llm-provider.types";
import { decryptApiKey } from "./crypto.utils";
import { getEncryptionSecret } from "./env.utils";

export function createLlmApi(row: LlmProviderRow): BaseLlmApi {
  const apiKey = row.api_key_encrypted
    ? decryptApiKey(row.api_key_encrypted, getEncryptionSecret())
    : "";

  return new OllamaLlmApi({
    url: row.url,
    apiKey,
  });
}
