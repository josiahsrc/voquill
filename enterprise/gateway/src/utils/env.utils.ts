export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "development-secret";
}

export function getEncryptionSecret(): string {
  return process.env.ENCRYPTION_SECRET || "development-encryption-secret";
}

export function getGatewayVersion(): string {
  return process.env.GATEWAY_VERSION || "0.0.1";
}
