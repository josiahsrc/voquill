CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    access_token_ciphertext TEXT,
    refresh_token_ciphertext TEXT,
    token_expires_at INTEGER,
    salt TEXT
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_created_at ON mcp_servers (created_at DESC);
