import type { BaseSttApi } from "../apis/stt.api";
import { SpeachesSttApi } from "../apis/stt.api";
import type { SttProviderRow } from "../types/stt-provider.types";
import { decryptApiKey } from "./crypto.utils";
import { getEncryptionSecret } from "./env.utils";

export function createTranscriptionApi(
  row: SttProviderRow,
): BaseSttApi {
  const apiKey = row.api_key_encrypted
    ? decryptApiKey(row.api_key_encrypted, getEncryptionSecret())
    : "";

  return new SpeachesSttApi({
    url: row.url,
    apiKey,
    model: row.model,
  });
}
