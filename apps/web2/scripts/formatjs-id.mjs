const NON_LETTER_NUMBER = /[^a-z0-9]+/gi;
const EDGE_UNDERSCORES = /^_+|_+$/g;

const sanitize = (value) => {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(NON_LETTER_NUMBER, "_")
    .replace(EDGE_UNDERSCORES, "")
    .replace(/_{2,}/g, "_");
};

const truncate = (value, maxLength = 60) => {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength).replace(EDGE_UNDERSCORES, "");
};

export const createMessageId = (defaultMessage = "") => {
  const sanitized = sanitize(defaultMessage);
  const truncated = truncate(sanitized);
  return truncated || "message";
};

export const formatjsOverrideIdFn = (id, defaultMessage, _description, _filePath) => {
  if (id || !defaultMessage) {
    return id;
  }
  return createMessageId(defaultMessage);
};
