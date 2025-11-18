-- Remove any previously persisted system tones
DELETE FROM tones WHERE is_system = 1;

-- Normalize the tones table to drop the legacy system flag
CREATE TABLE IF NOT EXISTS tones_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO tones_new (id, name, prompt_template, created_at, sort_order)
SELECT id, name, prompt_template, created_at, sort_order FROM tones;

DROP TABLE IF EXISTS tones;
ALTER TABLE tones_new RENAME TO tones;

DROP INDEX IF EXISTS idx_tones_is_system;
CREATE INDEX IF NOT EXISTS idx_tones_sort_order ON tones(sort_order);

-- Rebuild user_preferences without the initial tone flag
CREATE TABLE IF NOT EXISTS user_preferences_new (
  user_id TEXT PRIMARY KEY,
  transcription_mode TEXT,
  transcription_api_key_id TEXT,
  post_processing_mode TEXT,
  post_processing_api_key_id TEXT,
  active_tone_id TEXT
);

INSERT INTO user_preferences_new (
  user_id,
  transcription_mode,
  transcription_api_key_id,
  post_processing_mode,
  post_processing_api_key_id,
  active_tone_id
)
SELECT
  user_id,
  transcription_mode,
  transcription_api_key_id,
  post_processing_mode,
  post_processing_api_key_id,
  active_tone_id
FROM user_preferences;

DROP TABLE IF EXISTS user_preferences;
ALTER TABLE user_preferences_new RENAME TO user_preferences;
