CREATE TABLE ai_usage_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  status VARCHAR(10) NOT NULL,
  latency_ms INTEGER NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_metrics_created_at ON ai_usage_metrics (created_at);
CREATE INDEX idx_ai_usage_metrics_user_id ON ai_usage_metrics (user_id);
