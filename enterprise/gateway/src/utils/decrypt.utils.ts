import crypto from "crypto";

export function decryptWithPublicKey(
  packed: Buffer,
  publicKeyPem: string,
): Buffer {
  const keyLen = packed.readUInt16BE(0);
  const encryptedKey = packed.subarray(2, 2 + keyLen);
  const iv = packed.subarray(2 + keyLen, 2 + keyLen + 16);
  const encryptedData = packed.subarray(2 + keyLen + 16);

  const raw = crypto.publicDecrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_NO_PADDING,
    },
    encryptedKey,
  );
  const aesKey = raw.subarray(raw.length - 32);

  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted;
}
