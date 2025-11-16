-- Add flag for tracking whether initial tones were created on device
ALTER TABLE user_preferences
  ADD COLUMN has_created_initial_tones INTEGER NOT NULL DEFAULT 0;
