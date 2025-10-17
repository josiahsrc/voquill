CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT NOT NULL,
    onboarded INTEGER NOT NULL DEFAULT 0 CHECK (onboarded IN (0, 1))
);
