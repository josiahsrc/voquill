function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export function hasGroqApiKey(): boolean {
  const value = process.env.GROQ_API_KEY;
  return typeof value === "string" && value.trim().length > 0;
}

export function getGroqApiKey(): string {
  return getEnvOrThrow("GROQ_API_KEY");
}

export function getOpenAIApiKey(): string {
  return getEnvOrThrow("OPENAI_API_KEY");
}
