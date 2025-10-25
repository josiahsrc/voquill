ALTER TABLE transcriptions
    ADD COLUMN audio_path TEXT;

ALTER TABLE transcriptions
    ADD COLUMN audio_duration_ms INTEGER;
