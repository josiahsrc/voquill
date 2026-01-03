-- Add agent mode configuration to user_preferences
ALTER TABLE user_preferences ADD COLUMN agent_mode TEXT;
ALTER TABLE user_preferences ADD COLUMN agent_mode_api_key_id TEXT;
