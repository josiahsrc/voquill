export type LlmProviderRow = {
  id: string;
  provider: string;
  name: string;
  url: string;
  api_key_encrypted: string;
  api_key_suffix: string;
  model: string;
  is_enabled: boolean;
  created_at: Date;
};
