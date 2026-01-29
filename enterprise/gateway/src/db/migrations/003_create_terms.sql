CREATE TABLE terms (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth(id),
  created_at TIMESTAMP DEFAULT NOW(),
  source_value TEXT NOT NULL,
  destination_value TEXT NOT NULL,
  is_replacement BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_terms_user_id ON terms(user_id);
