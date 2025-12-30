import { describe, expect, it } from "vitest";
import {
  calculateEstimatedTypingMinutes,
  calculateTimeSavedMinutes,
  formatTime,
  TYPING_WPM,
} from "./stats.utils";

describe("TYPING_WPM constant", () => {
  it("should be 45 WPM", () => {
    expect(TYPING_WPM).toBe(45);
  });
});

describe("calculateEstimatedTypingMinutes", () => {
  it("should return 0 for 0 words", () => {
    expect(calculateEstimatedTypingMinutes(0)).toBe(0);
  });

  it("should return 0 for negative word count", () => {
    expect(calculateEstimatedTypingMinutes(-100)).toBe(0);
  });

  it("should calculate correct typing time for 45 words (1 minute)", () => {
    expect(calculateEstimatedTypingMinutes(45)).toBe(1);
  });

  it("should calculate correct typing time for 90 words (2 minutes)", () => {
    expect(calculateEstimatedTypingMinutes(90)).toBe(2);
  });

  it("should calculate correct typing time for 100 words", () => {
    // 100 / 45 = 2.222...
    const result = calculateEstimatedTypingMinutes(100);
    expect(result).toBeCloseTo(2.22, 2);
  });

  it("should handle large word counts", () => {
    // 4500 words / 45 = 100 minutes
    expect(calculateEstimatedTypingMinutes(4500)).toBe(100);
  });
});

describe("calculateTimeSavedMinutes", () => {
  it("should return 0 for 0 words and 0 duration", () => {
    expect(calculateTimeSavedMinutes(0, 0)).toBe(0);
  });

  it("should return time saved when typing time exceeds transcription time", () => {
    // 45 words takes 1 minute to type
    // 30 seconds (30000ms) to transcribe
    // Saved = 1 - 0.5 = 0.5 minutes
    const result = calculateTimeSavedMinutes(45, 30000);
    expect(result).toBe(0.5);
  });

  it("should return 0 when transcription time exceeds typing time", () => {
    // 45 words takes 1 minute to type
    // 2 minutes (120000ms) to transcribe
    // Would be negative, but should return 0
    const result = calculateTimeSavedMinutes(45, 120000);
    expect(result).toBe(0);
  });

  it("should calculate realistic time savings", () => {
    // 450 words takes 10 minutes to type
    // 3 minutes (180000ms) to speak/transcribe
    // Saved = 10 - 3 = 7 minutes
    const result = calculateTimeSavedMinutes(450, 180000);
    expect(result).toBe(7);
  });

  it("should handle large word counts", () => {
    // 4500 words takes 100 minutes to type
    // 30 minutes (1800000ms) to speak
    // Saved = 100 - 30 = 70 minutes
    const result = calculateTimeSavedMinutes(4500, 1800000);
    expect(result).toBe(70);
  });
});

describe("formatTime", () => {
  it('should return "< 1 min" for less than 1 minute', () => {
    expect(formatTime(0)).toBe("< 1 min");
    expect(formatTime(0.5)).toBe("< 1 min");
    expect(formatTime(0.99)).toBe("< 1 min");
  });

  it("should format minutes correctly", () => {
    expect(formatTime(1)).toBe("1 min");
    expect(formatTime(5)).toBe("5 min");
    expect(formatTime(30)).toBe("30 min");
    expect(formatTime(59)).toBe("59 min");
  });

  it("should round minutes to nearest integer", () => {
    expect(formatTime(5.4)).toBe("5 min");
    expect(formatTime(5.6)).toBe("6 min");
  });

  it("should format hours correctly", () => {
    expect(formatTime(60)).toBe("1 hr");
    expect(formatTime(120)).toBe("2 hr");
  });

  it("should format hours and minutes correctly", () => {
    expect(formatTime(90)).toBe("1 hr 30 min");
    expect(formatTime(150)).toBe("2 hr 30 min");
    expect(formatTime(75)).toBe("1 hr 15 min");
  });

  it("should handle custom labels", () => {
    expect(
      formatTime(90, {
        hrLabel: "hour",
        minLabel: "minute",
      }),
    ).toBe("1 hour 30 minute");
  });

  it("should handle custom lessThanOneMin label", () => {
    expect(
      formatTime(0.5, {
        lessThanOneMin: "Less than a minute",
      }),
    ).toBe("Less than a minute");
  });
});
