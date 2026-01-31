import type { EmbeddedConfig } from "../types/embedded-config.types";
import { decryptWithPublicKey } from "./decrypt.utils";
import { getEmbeddedConfigB64, getPublicSigningKey } from "./env.utils";

let cached: EmbeddedConfig | null = null;

export function clearEmbeddedConfigCache(): void {
  cached = null;
}

export function getEmbeddedConfig(): EmbeddedConfig {
  if (cached) {
    return cached;
  }

  try {
    const packed = Buffer.from(getEmbeddedConfigB64(), "base64");
    const publicKey = getPublicSigningKey();
    const decrypted = decryptWithPublicKey(packed, publicKey);
    cached = JSON.parse(decrypted.toString("utf-8")) as EmbeddedConfig;
    return cached;
  } catch (error) {
    console.error("Failed to get embedded config:", error);
    throw new Error(
      "You must obtain a valid enterprise license to use this software.",
    );
  }
}
