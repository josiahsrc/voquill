-- Add OpenRouter-specific configuration to api_keys table
ALTER TABLE api_keys ADD COLUMN openrouter_config TEXT;
