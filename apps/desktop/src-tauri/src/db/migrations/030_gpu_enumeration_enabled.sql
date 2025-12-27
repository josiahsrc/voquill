-- Add GPU enumeration enabled flag to user_preferences
-- This allows users to opt-in to GPU hardware acceleration
ALTER TABLE user_preferences
ADD COLUMN gpu_enumeration_enabled INTEGER NOT NULL DEFAULT 0;
