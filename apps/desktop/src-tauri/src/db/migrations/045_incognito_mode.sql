ALTER TABLE user_preferences ADD COLUMN incognito_mode_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN incognito_mode_include_in_stats INTEGER NOT NULL DEFAULT 0;
