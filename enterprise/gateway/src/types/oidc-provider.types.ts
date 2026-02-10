export type OidcProviderRow = {
  id: string;
  name: string;
  issuer_url: string;
  client_id: string;
  client_secret_encrypted: string;
  is_enabled: boolean;
  created_at: Date;
};
