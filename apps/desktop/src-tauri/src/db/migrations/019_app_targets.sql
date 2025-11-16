-- Create app_targets table for tracking applications that generate audio
CREATE TABLE IF NOT EXISTS app_targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Support efficient ordering by creation timestamp
CREATE INDEX IF NOT EXISTS idx_app_targets_created_at ON app_targets(created_at);
