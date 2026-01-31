export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "development-secret";
}

export function getEncryptionSecret(): string {
  return process.env.ENCRYPTION_SECRET || "development-encryption-secret";
}

export function getGatewayVersion(): string {
  return process.env.GATEWAY_VERSION || "0.0.1";
}

export function getLicenseKey(): string {
  const b64 = process.env.LICENSE_KEY;
  if (!b64) {
    throw new Error("LICENSE_KEY environment variable is not set");
  }
  return b64;
}

export function getPublicSigningKey(): string {
  const b64 =
    process.env.PUBLIC_SIGNING_KEY_B64 ||
    "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF1M0h1bzNHMmR4cDUxTkorSGxiaApCVlF2WUtXOEJ0QUhONlAzMlZmM1RET3luUTl0dHZSOHlZZnBrbFZ2SXZ3ZDd3M094UVI5WVorSHJIRUdQT2p2Cm4yY2w1U1J5OGtTZFpvNXFNUy85Um4rTnlXLzlna2NsVjlua2lkd3BQT2EyVk0yTlFZaW5ia3QxQlA3R2t5ZU0KNVVHQm15OXdUNHFkZDE1WWpJWG1WVS9CRGk2Q2JRb21rNy9mNVZ1UEMrcnVicTJEQ2phcy94MVdaYllJQUgrSAoyRHhWY3ExRkJnQWo4U3FJS1UvNVlMb2FwdFlmemxsUm9kZnFpT0NzUnhjZTZ2TmlId1hNYWk4UW41RVdEYTZlCnNMRXBMMzNjcnNHNWpPODNyY2w2bFk2MnVFVEd4N2ZmdmFJV0h6dzlUbnZmQWpKY290ZjZWS3drN0NibzVEWnAKSndJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";
  return Buffer.from(b64, "base64").toString("utf-8");
}
