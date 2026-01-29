import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "voquill-stt-providers", KEY_LENGTH);
}

export function encryptApiKey(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptApiKey(ciphertext: string, secret: string): string {
  const [ivB64, encB64, tagB64] = ciphertext.split(":");
  const key = deriveKey(secret);
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
