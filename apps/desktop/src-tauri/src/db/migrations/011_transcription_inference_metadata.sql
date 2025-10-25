ALTER TABLE transcriptions
    ADD COLUMN model_size TEXT;

ALTER TABLE transcriptions
    ADD COLUMN inference_device TEXT;
