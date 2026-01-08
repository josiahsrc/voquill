-- Add Azure-specific configuration to api_keys table
ALTER TABLE api_keys ADD COLUMN azure_region TEXT;
