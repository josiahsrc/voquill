ALTER TABLE user_profiles
  ADD COLUMN preferred_transcription_mode TEXT;

ALTER TABLE user_profiles
  ADD COLUMN preferred_transcription_api_key_id TEXT;

ALTER TABLE user_profiles
  ADD COLUMN preferred_post_processing_mode TEXT;

ALTER TABLE user_profiles
  ADD COLUMN preferred_post_processing_api_key_id TEXT;
