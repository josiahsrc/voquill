ALTER TABLE terms ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_terms_global ON terms(is_global) WHERE is_global = TRUE;
