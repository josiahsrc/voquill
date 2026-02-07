CREATE TABLE oidc_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE auth ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE auth ADD COLUMN oidc_sub TEXT;
ALTER TABLE auth ADD COLUMN oidc_provider_id UUID;
ALTER TABLE auth ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'password';
