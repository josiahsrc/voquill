export const normalizeAppTargetId = (name: string): string => {
  const trimmed = name.trim().toLowerCase();
  const sanitized = trimmed
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (sanitized.length === 0) {
    return `app_target_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return sanitized;
};
