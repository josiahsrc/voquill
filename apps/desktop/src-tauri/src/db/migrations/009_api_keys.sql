CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    salt TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_ciphertext TEXT NOT NULL,
    key_suffix TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys (created_at DESC);
