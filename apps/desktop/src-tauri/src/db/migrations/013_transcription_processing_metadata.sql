ALTER TABLE transcriptions
    ADD COLUMN raw_transcript TEXT;

ALTER TABLE transcriptions
    ADD COLUMN transcription_prompt TEXT;

ALTER TABLE transcriptions
    ADD COLUMN post_process_prompt TEXT;

ALTER TABLE transcriptions
    ADD COLUMN transcription_api_key_id TEXT;

ALTER TABLE transcriptions
    ADD COLUMN post_process_api_key_id TEXT;

ALTER TABLE transcriptions
    ADD COLUMN transcription_mode TEXT;

ALTER TABLE transcriptions
    ADD COLUMN post_process_mode TEXT;

ALTER TABLE transcriptions
    ADD COLUMN post_process_device TEXT;
