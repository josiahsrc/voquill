-- Allow app targets to reference their preferred tone
ALTER TABLE app_targets
  ADD COLUMN tone_id TEXT REFERENCES tones(id);
