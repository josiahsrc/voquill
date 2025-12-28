-- Add base_url column to api_keys for OLLAMA and future custom endpoints
ALTER TABLE api_keys ADD COLUMN base_url TEXT;
