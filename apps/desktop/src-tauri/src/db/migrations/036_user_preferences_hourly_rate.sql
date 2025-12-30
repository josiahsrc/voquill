-- Add hourly_rate column to user_preferences for calculating money saved
ALTER TABLE user_preferences
  ADD COLUMN hourly_rate REAL;
