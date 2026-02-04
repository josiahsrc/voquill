CREATE TABLE tones (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth(id),
  created_at TIMESTAMP DEFAULT NOW(),
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_global BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_tones_user_id ON tones(user_id);
CREATE INDEX idx_tones_global ON tones(is_global) WHERE is_global = TRUE;
