CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth(id),
  type VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  price_id VARCHAR(255),
  words_today INTEGER DEFAULT 0,
  words_this_month INTEGER DEFAULT 0,
  words_total INTEGER DEFAULT 0,
  tokens_today INTEGER DEFAULT 0,
  tokens_this_month INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  today_reset_at TIMESTAMP DEFAULT NOW(),
  this_month_reset_at TIMESTAMP DEFAULT NOW(),
  is_on_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMP
);
