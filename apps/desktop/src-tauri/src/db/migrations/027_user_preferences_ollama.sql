-- Add Ollama configuration columns to user_preferences
ALTER TABLE user_preferences
ADD COLUMN post_processing_ollama_url TEXT;

ALTER TABLE user_preferences
ADD COLUMN post_processing_ollama_model TEXT;
