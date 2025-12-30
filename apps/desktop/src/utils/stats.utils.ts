// Average words per minute for typing vs speaking
export const TYPING_WPM = 40;
export const SPEAKING_WPM = 150;

// Maximum reasonable hourly rate (for validation)
export const MAX_HOURLY_RATE = 10000;

/**
 * Calculate time saved in minutes based on word count.
 * Time saved = time to type - time to speak
 */
export const calculateTimeSavedMinutes = (wordCount: number): number => {
  if (wordCount <= 0) {
    return 0;
  }
  const typingMinutes = wordCount / TYPING_WPM;
  const speakingMinutes = wordCount / SPEAKING_WPM;
  return typingMinutes - speakingMinutes;
};

/**
 * Format time saved for display.
 * Returns localized time string like "< 1 min", "5 min", "1 hr 30 min"
 */
export const formatTimeSaved = (
  minutes: number,
  options?: {
    lessThanOneMin?: string;
    minLabel?: string;
    hrLabel?: string;
  },
): string => {
  const lessThanOneMin = options?.lessThanOneMin ?? "< 1 min";
  const minLabel = options?.minLabel ?? "min";
  const hrLabel = options?.hrLabel ?? "hr";

  if (minutes < 1) {
    return lessThanOneMin;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} ${minLabel}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours} ${hrLabel}`;
  }
  return `${hours} ${hrLabel} ${remainingMinutes} ${minLabel}`;
};

/**
 * Format money saved for display using Intl.NumberFormat.
 */
export const formatMoneySaved = (
  amount: number,
  locale: string,
  currency: string = "USD",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Validate and normalize hourly rate input.
 * Returns null for invalid/empty input, or the validated number.
 */
export const validateHourlyRate = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const numericValue = parseFloat(trimmed);
  if (
    isNaN(numericValue) ||
    numericValue < 0 ||
    numericValue > MAX_HOURLY_RATE
  ) {
    return null;
  }
  return numericValue;
};
