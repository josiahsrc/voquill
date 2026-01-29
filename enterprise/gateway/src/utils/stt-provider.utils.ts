import type { BaseTranscriptionApi } from "../apis/transcription.api";
import { OpenAITranscriptionApi } from "../apis/transcription.api";
import type { SttProviderRow } from "../types/stt-provider.types";
import { decryptApiKey } from "./crypto.utils";
import { getEncryptionSecret } from "./env.utils";

export function createTranscriptionApi(
  row: SttProviderRow,
): BaseTranscriptionApi {
  const apiKey = row.api_key_encrypted
    ? decryptApiKey(row.api_key_encrypted, getEncryptionSecret())
    : "";

  return new OpenAITranscriptionApi({
    url: row.url,
    apiKey,
    model: row.model,
  });
}
