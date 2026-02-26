export const OPENAI_COMPATIBLE_DEFAULT_URL = "http://127.0.0.1:8080";

export const normalizeOpenAICompatibleBaseUrl = (
  baseUrl?: string | null,
): string => {
  const candidate = baseUrl?.trim() || OPENAI_COMPATIBLE_DEFAULT_URL;
  return candidate.replace(/\/+$/, "");
};

export const buildOpenAICompatibleUrl = (
  baseUrl?: string | null,
  includeV1Path?: boolean | null,
): string => {
  const normalized = normalizeOpenAICompatibleBaseUrl(baseUrl);
  const shouldIncludeV1 = includeV1Path ?? true;

  // Check if the URL already ends with /v1
  if (normalized.endsWith("/v1")) {
    return normalized;
  }

  return shouldIncludeV1 ? `${normalized}/v1` : normalized;
};
