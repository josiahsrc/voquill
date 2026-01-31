import type { LicenseKey } from "../types/license-key.types";
import { decryptWithPublicKey } from "./decrypt.utils";
import { getLicenseKey as getLicenseKeyB64, getPublicSigningKey } from "./env.utils";

let cached: LicenseKey | null = null;

export function clearLicenseKeyCache(): void {
  cached = null;
}

export function getLicenseKey(): LicenseKey {
  if (cached) {
    return cached;
  }

  try {
    const packed = Buffer.from(getLicenseKeyB64(), "base64");
    const publicKey = getPublicSigningKey();
    const decrypted = decryptWithPublicKey(packed, publicKey);
    cached = JSON.parse(decrypted.toString("utf-8")) as LicenseKey;
    return cached;
  } catch (error) {
    console.error("Failed to get license key:", error);
    throw new Error(
      "You must obtain a valid enterprise license to use this software.",
    );
  }
}
