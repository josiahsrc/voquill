export type ProviderPurpose = "transcription" | "ai";

export type ProviderRow = {
  id: string;
  purpose: ProviderPurpose;
  provider: string;
  name: string;
  url: string;
  api_key_encrypted: string;
  api_key_suffix: string;
  model: string;
  is_enabled: boolean;
  created_at: Date;
};
