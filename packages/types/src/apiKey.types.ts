export type ApiKeyProvider = "groq";

export type ApiKey = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  createdAt: string;
  keySuffix?: string | null;
  keyFull?: string | null;
};
