ALTER TABLE user_preferences ADD COLUMN remote_output_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN remote_target_device_id TEXT;

CREATE TABLE IF NOT EXISTS paired_remote_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    role TEXT NOT NULL,
    shared_secret TEXT NOT NULL,
    paired_at TEXT NOT NULL,
    last_seen_at TEXT,
    last_known_address TEXT,
    trusted INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_paired_remote_devices_paired_at
    ON paired_remote_devices(paired_at);
