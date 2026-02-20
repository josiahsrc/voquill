function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getGroqApiKey(): string {
  return getEnvOrThrow("GROQ_API_KEY");
}

export function getOpenAIApiKey(): string {
  return getEnvOrThrow("OPENAI_API_KEY");
}
