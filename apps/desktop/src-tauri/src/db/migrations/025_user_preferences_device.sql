-- Add transcription device and model size columns to user_preferences
ALTER TABLE user_preferences
ADD COLUMN transcription_device TEXT;

ALTER TABLE user_preferences
ADD COLUMN transcription_model_size TEXT;
