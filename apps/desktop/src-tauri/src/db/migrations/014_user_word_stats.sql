ALTER TABLE user_profiles
  ADD COLUMN words_this_month INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_profiles
  ADD COLUMN words_this_month_month TEXT;

ALTER TABLE user_profiles
  ADD COLUMN words_total INTEGER NOT NULL DEFAULT 0;
