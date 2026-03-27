ALTER TABLE members ADD COLUMN words_this_week INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN tokens_this_week INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN this_week_reset_at TIMESTAMP;
