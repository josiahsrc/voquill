ALTER TABLE llm_providers ADD COLUMN tier INTEGER NOT NULL DEFAULT 0;
UPDATE llm_providers SET tier = 2 WHERE is_enabled = true;
ALTER TABLE llm_providers DROP COLUMN is_enabled;

ALTER TABLE stt_providers ADD COLUMN tier INTEGER NOT NULL DEFAULT 0;
UPDATE stt_providers SET tier = 1 WHERE is_enabled = true;
ALTER TABLE stt_providers DROP COLUMN is_enabled;
