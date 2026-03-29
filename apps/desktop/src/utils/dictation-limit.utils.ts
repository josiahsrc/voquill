import type { UserPreferences } from "@repo/types";
import { minutesToMilliseconds } from "./time.utils";

export const DEFAULT_DICTATION_LIMIT_MINUTES = 5;

export const normalizeDictationLimitMinutes = (
  value: number | null | undefined,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DICTATION_LIMIT_MINUTES;
  }

  return Math.max(0, Math.floor(value));
};

export const getEffectiveDictationLimitMinutes = (
  preferences:
    | Pick<UserPreferences, "dictationLimitMinutes">
    | null
    | undefined,
): number => {
  return normalizeDictationLimitMinutes(preferences?.dictationLimitMinutes);
};

export type DictationRecordingTimerDurations = {
  warningDurationMs: number | null;
  autoStopDurationMs: number | null;
};

export const getDictationRecordingTimerDurations = (
  limitMinutes: number,
): DictationRecordingTimerDurations => {
  const normalizedLimitMinutes = normalizeDictationLimitMinutes(limitMinutes);

  if (normalizedLimitMinutes === 0) {
    return {
      warningDurationMs: null,
      autoStopDurationMs: null,
    };
  }

  return {
    warningDurationMs:
      normalizedLimitMinutes > 1
        ? minutesToMilliseconds(normalizedLimitMinutes - 1)
        : null,
    autoStopDurationMs: minutesToMilliseconds(normalizedLimitMinutes),
  };
};
