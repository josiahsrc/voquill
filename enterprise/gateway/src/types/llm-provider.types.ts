export type LlmProviderRow = {
  id: string;
  provider: string;
  name: string;
  url: string;
  api_key_encrypted: string;
  api_key_suffix: string;
  model: string;
  tier: number;
  pull_status: string;
  pull_error: string | null;
  created_at: Date;
};
