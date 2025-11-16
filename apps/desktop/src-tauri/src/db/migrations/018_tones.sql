-- Create tones table for storing tone definitions and prompt templates
CREATE TABLE IF NOT EXISTS tones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Add active_tone_id to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN active_tone_id TEXT;

-- Create index for efficient lookups
CREATE INDEX idx_tones_is_system ON tones(is_system);
CREATE INDEX idx_tones_sort_order ON tones(sort_order);
