import { FiremixTimestamp } from "@firemix/core";

export type ApiKeyProvider = "groq";

export type ApiKey = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  createdAt: FiremixTimestamp;
  keySuffix?: string | null;
  keyFull?: string | null;
};
