-- Allow app targets to store an optional icon path
ALTER TABLE app_targets
  ADD COLUMN icon_path TEXT;
