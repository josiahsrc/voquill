ALTER TABLE enterprise_config ADD COLUMN assistant_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE enterprise_config ADD COLUMN power_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE enterprise_config ADD COLUMN allow_multi_device_mode BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE enterprise_config DROP COLUMN allow_change_agent_mode;
