ALTER TABLE user_preferences ADD COLUMN preferred_microphone TEXT;

ALTER TABLE user_profiles ADD COLUMN has_migrated_preferred_microphone INTEGER NOT NULL DEFAULT 0;
