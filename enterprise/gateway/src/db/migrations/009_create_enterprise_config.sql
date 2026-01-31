CREATE TABLE enterprise_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  allow_change_post_processing BOOLEAN NOT NULL DEFAULT FALSE,
  allow_change_transcription_method BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO enterprise_config (id) VALUES ('default');
