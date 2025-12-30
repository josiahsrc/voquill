-- Add duration_total_ms column to track total audio recording duration
ALTER TABLE user_profiles
  ADD COLUMN duration_total_ms INTEGER NOT NULL DEFAULT 0;
