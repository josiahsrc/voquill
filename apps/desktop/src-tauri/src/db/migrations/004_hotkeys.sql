CREATE TABLE IF NOT EXISTS hotkeys (
    id TEXT PRIMARY KEY,
    action_name TEXT NOT NULL,
    keys TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hotkeys_action_name ON hotkeys (action_name);
