// Average typing speed assumption for MVP
export const TYPING_WPM = 45;

/**
 * Calculate estimated typing time in minutes based on word count.
 */
export const calculateEstimatedTypingMinutes = (wordCount: number): number => {
  if (wordCount <= 0) {
    return 0;
  }
  return wordCount / TYPING_WPM;
};

/**
 * Calculate time saved in minutes.
 * Time saved = estimated typing time - actual transcription time
 */
export const calculateTimeSavedMinutes = (
  wordCount: number,
  durationTotalMs: number,
): number => {
  const typingMinutes = calculateEstimatedTypingMinutes(wordCount);
  const transcriptionMinutes = durationTotalMs / 60000;
  const saved = typingMinutes - transcriptionMinutes;
  return Math.max(0, saved); // Don't return negative time saved
};

/**
 * Format time for display.
 * Returns localized time string like "< 1 min", "5 min", "1 hr 30 min"
 */
export const formatTime = (
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
