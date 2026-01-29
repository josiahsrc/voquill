CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('transcription', 'ai')),
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_suffix VARCHAR(4) NOT NULL,
  model VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
