import type { IntlShape } from "react-intl";

export const nowIso = (): string => {
  return new Date().toISOString();
};

export const formatRelativeTime = (
  intl: IntlShape,
  isoDate: string,
): string => {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return intl.formatMessage({ defaultMessage: "Just now" });
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return intl.formatRelativeTime(-diffMinutes, "minute", { numeric: "auto" });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return intl.formatRelativeTime(-diffHours, "hour", { numeric: "auto" });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return intl.formatRelativeTime(-diffDays, "day", { numeric: "auto" });
  }

  return intl.formatDate(isoDate, {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
};
