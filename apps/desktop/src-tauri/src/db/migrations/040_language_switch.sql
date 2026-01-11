ALTER TABLE user_preferences ADD COLUMN language_switch_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN secondary_dictation_language TEXT;
ALTER TABLE user_preferences ADD COLUMN active_dictation_language TEXT;
