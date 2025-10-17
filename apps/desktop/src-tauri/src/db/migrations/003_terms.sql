CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    created_by_user_id TEXT NOT NULL,
    source_value TEXT NOT NULL,
    destination_value TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_terms_created_at ON terms (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terms_is_deleted ON terms (is_deleted);
