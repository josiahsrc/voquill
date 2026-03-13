import { createIntl, createIntlCache } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./date.utils";

const intl = createIntl(
  { locale: "en", defaultLocale: "en", messages: {} },
  createIntlCache(),
);

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for less than 60 seconds ago", () => {
    expect(formatRelativeTime(intl, ago(0))).toBe("Just now");
    expect(formatRelativeTime(intl, ago(30 * SECOND))).toBe("Just now");
    expect(formatRelativeTime(intl, ago(59 * SECOND))).toBe("Just now");
  });

  it("returns minutes for 1–59 minutes ago", () => {
    expect(formatRelativeTime(intl, ago(1 * MINUTE))).toBe("1 minute ago");
    expect(formatRelativeTime(intl, ago(5 * MINUTE))).toBe("5 minutes ago");
    expect(formatRelativeTime(intl, ago(59 * MINUTE))).toBe("59 minutes ago");
  });

  it("returns hours for 1–23 hours ago", () => {
    expect(formatRelativeTime(intl, ago(1 * HOUR))).toBe("1 hour ago");
    expect(formatRelativeTime(intl, ago(3 * HOUR))).toBe("3 hours ago");
    expect(formatRelativeTime(intl, ago(23 * HOUR))).toBe("23 hours ago");
  });

  it("returns days for 1–6 days ago", () => {
    expect(formatRelativeTime(intl, ago(1 * DAY))).toBe("yesterday");
    expect(formatRelativeTime(intl, ago(2 * DAY))).toBe("2 days ago");
    expect(formatRelativeTime(intl, ago(6 * DAY))).toBe("6 days ago");
  });

  it("returns formatted date for 7+ days ago", () => {
    expect(formatRelativeTime(intl, ago(7 * DAY))).toBe("Mar 6");
    expect(formatRelativeTime(intl, ago(30 * DAY))).toBe("Feb 11");
  });

  it("includes year for dates over 365 days ago", () => {
    expect(formatRelativeTime(intl, ago(400 * DAY))).toBe("Feb 7, 2025");
  });
});
