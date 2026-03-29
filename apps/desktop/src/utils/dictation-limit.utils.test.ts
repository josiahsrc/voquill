import { describe, expect, it } from "vitest";
import {
  DEFAULT_DICTATION_LIMIT_MINUTES,
  getDictationRecordingTimerDurations,
  getEffectiveDictationLimitMinutes,
  normalizeDictationLimitMinutes,
} from "./dictation-limit.utils";

describe("normalizeDictationLimitMinutes", () => {
  it("falls back to the default when the value is missing or invalid", () => {
    expect(normalizeDictationLimitMinutes(undefined)).toBe(
      DEFAULT_DICTATION_LIMIT_MINUTES,
    );
    expect(normalizeDictationLimitMinutes(null)).toBe(
      DEFAULT_DICTATION_LIMIT_MINUTES,
    );
    expect(normalizeDictationLimitMinutes(Number.NaN)).toBe(
      DEFAULT_DICTATION_LIMIT_MINUTES,
    );
  });

  it("clamps negative values to zero and rounds decimals down", () => {
    expect(normalizeDictationLimitMinutes(-2)).toBe(0);
    expect(normalizeDictationLimitMinutes(3.8)).toBe(3);
  });
});

describe("getEffectiveDictationLimitMinutes", () => {
  it("returns the stored preference when present", () => {
    expect(
      getEffectiveDictationLimitMinutes({ dictationLimitMinutes: 8 }),
    ).toBe(8);
  });

  it("returns the default when preferences are missing", () => {
    expect(getEffectiveDictationLimitMinutes(null)).toBe(
      DEFAULT_DICTATION_LIMIT_MINUTES,
    );
  });
});

describe("getDictationRecordingTimerDurations", () => {
  it("disables both timers when the limit is zero", () => {
    expect(getDictationRecordingTimerDurations(0)).toEqual({
      warningDurationMs: null,
      autoStopDurationMs: null,
    });
  });

  it("disables the warning timer for one-minute limits", () => {
    expect(getDictationRecordingTimerDurations(1)).toEqual({
      warningDurationMs: null,
      autoStopDurationMs: 60_000,
    });
  });

  it("warns one minute before auto-stop for longer limits", () => {
    expect(getDictationRecordingTimerDurations(5)).toEqual({
      warningDurationMs: 240_000,
      autoStopDurationMs: 300_000,
    });
  });
});