ALTER TABLE tones ADD COLUMN system_prompt_template TEXT;
ALTER TABLE tones ADD COLUMN is_template_tone BOOLEAN NOT NULL DEFAULT FALSE;
