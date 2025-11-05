CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  transcription_mode TEXT,
  transcription_api_key_id TEXT,
  post_processing_mode TEXT,
  post_processing_api_key_id TEXT
);

INSERT INTO user_preferences (
  user_id,
  transcription_mode,
  transcription_api_key_id,
  post_processing_mode,
  post_processing_api_key_id
)
SELECT
  id,
  preferred_transcription_mode,
  preferred_transcription_api_key_id,
  preferred_post_processing_mode,
  preferred_post_processing_api_key_id
FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_preferences);
