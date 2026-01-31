ALTER TABLE stt_providers
  ADD COLUMN pull_status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  ADD COLUMN pull_error TEXT;

ALTER TABLE llm_providers
  ADD COLUMN pull_status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  ADD COLUMN pull_error TEXT;
