export const API_KEY_PROVIDERS = ["groq", "openai", "aldea"] as const;
export type ApiKeyProvider = (typeof API_KEY_PROVIDERS)[number];

export type ApiKey = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  createdAt: string;
  keySuffix?: string | null;
  keyFull?: string | null;
  transcriptionModel?: string | null;
  postProcessingModel?: string | null;
};
