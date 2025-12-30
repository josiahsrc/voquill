import { describe, expect, it } from "vitest";
import {
  calculateTimeSavedMinutes,
  formatTimeSaved,
  formatMoneySaved,
  validateHourlyRate,
  TYPING_WPM,
  SPEAKING_WPM,
  MAX_HOURLY_RATE,
} from "./stats.utils";

describe("calculateTimeSavedMinutes", () => {
  it("should return 0 for 0 words", () => {
    expect(calculateTimeSavedMinutes(0)).toBe(0);
  });

  it("should return 0 for negative word count", () => {
    expect(calculateTimeSavedMinutes(-100)).toBe(0);
  });

  it("should calculate correct time saved for 100 words", () => {
    // 100 words: typing = 100/40 = 2.5 min, speaking = 100/150 = 0.667 min
    // saved = 2.5 - 0.667 = 1.833 min
    const result = calculateTimeSavedMinutes(100);
    expect(result).toBeCloseTo(1.833, 2);
  });

  it("should calculate correct time saved for 1000 words", () => {
    // 1000 words: typing = 25 min, speaking = 6.67 min
    // saved = 25 - 6.67 = 18.33 min
    const result = calculateTimeSavedMinutes(1000);
    expect(result).toBeCloseTo(18.33, 1);
  });

  it("should handle large word counts", () => {
    // 100000 words: typing = 2500 min, speaking = 666.67 min
    // saved = 1833.33 min (~30.5 hours)
    const result = calculateTimeSavedMinutes(100000);
    expect(result).toBeCloseTo(1833.33, 0);
  });

  it("should use correct WPM constants", () => {
    expect(TYPING_WPM).toBe(40);
    expect(SPEAKING_WPM).toBe(150);
  });
});

describe("formatTimeSaved", () => {
  it('should return "< 1 min" for less than 1 minute', () => {
    expect(formatTimeSaved(0)).toBe("< 1 min");
    expect(formatTimeSaved(0.5)).toBe("< 1 min");
    expect(formatTimeSaved(0.99)).toBe("< 1 min");
  });

  it("should format minutes correctly", () => {
    expect(formatTimeSaved(1)).toBe("1 min");
    expect(formatTimeSaved(5)).toBe("5 min");
    expect(formatTimeSaved(30)).toBe("30 min");
    expect(formatTimeSaved(59)).toBe("59 min");
  });

  it("should round minutes to nearest integer", () => {
    expect(formatTimeSaved(5.4)).toBe("5 min");
    expect(formatTimeSaved(5.6)).toBe("6 min");
  });

  it("should format hours correctly", () => {
    expect(formatTimeSaved(60)).toBe("1 hr");
    expect(formatTimeSaved(120)).toBe("2 hr");
  });

  it("should format hours and minutes correctly", () => {
    expect(formatTimeSaved(90)).toBe("1 hr 30 min");
    expect(formatTimeSaved(150)).toBe("2 hr 30 min");
    expect(formatTimeSaved(75)).toBe("1 hr 15 min");
  });

  it("should handle custom labels", () => {
    expect(
      formatTimeSaved(90, {
        hrLabel: "hour",
        minLabel: "minute",
      }),
    ).toBe("1 hour 30 minute");
  });

  it("should handle custom lessThanOneMin label", () => {
    expect(
      formatTimeSaved(0.5, {
        lessThanOneMin: "Less than a minute",
      }),
    ).toBe("Less than a minute");
  });
});

describe("formatMoneySaved", () => {
  it("should format USD correctly", () => {
    expect(formatMoneySaved(100, "en-US", "USD")).toBe("$100");
    expect(formatMoneySaved(1234.56, "en-US", "USD")).toBe("$1,234.56");
  });

  it("should format with 0-2 decimal places", () => {
    expect(formatMoneySaved(100, "en-US")).toBe("$100");
    expect(formatMoneySaved(100.5, "en-US")).toBe("$100.5");
    expect(formatMoneySaved(100.123, "en-US")).toBe("$100.12");
  });

  it("should handle zero amount", () => {
    expect(formatMoneySaved(0, "en-US")).toBe("$0");
  });

  it("should handle different locales", () => {
    // Different locales may format numbers differently
    const result = formatMoneySaved(1234.56, "de-DE", "EUR");
    expect(result).toContain("1.234,56"); // German format
  });

  it("should default to USD when no currency provided", () => {
    expect(formatMoneySaved(50, "en-US")).toBe("$50");
  });
});

describe("validateHourlyRate", () => {
  it("should return null for empty string", () => {
    expect(validateHourlyRate("")).toBeNull();
  });

  it("should return null for whitespace only", () => {
    expect(validateHourlyRate("   ")).toBeNull();
  });

  it("should return null for non-numeric input", () => {
    expect(validateHourlyRate("abc")).toBeNull();
    expect(validateHourlyRate("$50")).toBeNull();
  });

  it("should return null for negative values", () => {
    expect(validateHourlyRate("-50")).toBeNull();
    expect(validateHourlyRate("-0.01")).toBeNull();
  });

  it("should return null for values exceeding MAX_HOURLY_RATE", () => {
    expect(validateHourlyRate("10001")).toBeNull();
    expect(validateHourlyRate("999999")).toBeNull();
  });

  it("should accept valid positive numbers", () => {
    expect(validateHourlyRate("0")).toBe(0);
    expect(validateHourlyRate("50")).toBe(50);
    expect(validateHourlyRate("100.50")).toBe(100.5);
    expect(validateHourlyRate("10000")).toBe(10000);
  });

  it("should trim whitespace before parsing", () => {
    expect(validateHourlyRate("  50  ")).toBe(50);
  });

  it("should have MAX_HOURLY_RATE constant defined", () => {
    expect(MAX_HOURLY_RATE).toBe(10000);
  });
});
