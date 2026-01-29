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

export function getSttServerUrls(): string[] {
  return getNumberedEnv("STT_SERVER_URL");
}

export function getLlmServerUrls(): string[] {
  return getNumberedEnv("LLM_SERVER_URL");
}

export function getSttModel(): string {
  return process.env.STT_MODEL || "Systran/faster-whisper-base";
}

export function getLlmModel(): string {
  return process.env.LLM_MODEL || "llama3.2:1b";
}
