export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "development-secret";
}

const _numberedEnvCache = new Map<string, string[]>();

export function getNumberedEnv(prefix: string): string[] {
  const cached = _numberedEnvCache.get(prefix);
  if (cached) return cached;
  const urls: string[] = [];
  for (let i = 0; ; i++) {
    const val = process.env[`${prefix}_${i}`];
    if (!val) break;
    urls.push(val);
  }
  _numberedEnvCache.set(prefix, urls);
  return urls;
}

export function clearEnvCache() {
  _numberedEnvCache.clear();
}

export function getLlmServerUrls(): string[] {
  return getNumberedEnv("LLM_SERVER_URL");
}

export function getLlmModel(): string {
  return process.env.LLM_MODEL || "llama3.2:1b";
}

export function getEncryptionSecret(): string {
  return process.env.ENCRYPTION_SECRET || "development-encryption-secret";
}

export function getGatewayVersion(): string {
  return process.env.GATEWAY_VERSION || "0.0.1";
}
