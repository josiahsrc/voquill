import { encryptApiKey, decryptApiKey } from "../../src/utils/crypto.utils";

describe("crypto utils", () => {
  const secret = "test-secret-key";

  it("encrypts and decrypts round-trip", () => {
    const plaintext = "sk-test-key-1234567890";
    const encrypted = encryptApiKey(plaintext, secret);
    const decrypted = decryptApiKey(encrypted, secret);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for different plaintexts", () => {
    const encrypted1 = encryptApiKey("key-one", secret);
    const encrypted2 = encryptApiKey("key-two", secret);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("produces different ciphertexts for same plaintext (random IV)", () => {
    const encrypted1 = encryptApiKey("same-key", secret);
    const encrypted2 = encryptApiKey("same-key", secret);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("fails to decrypt with wrong secret", () => {
    const encrypted = encryptApiKey("my-key", secret);
    expect(() => decryptApiKey(encrypted, "wrong-secret")).toThrow();
  });
});
