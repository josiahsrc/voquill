import { describe, expect, it } from "vitest";
import {
  daysToMilliseconds,
  hoursToMilliseconds,
  minutesToMilliseconds,
} from "./time.utils";

describe("daysToMilliseconds", () => {
  it("should work", () => {
    expect(daysToMilliseconds(1)).toBe(86400000);
    expect(daysToMilliseconds(0)).toBe(0);
    expect(daysToMilliseconds(2.5)).toBe(216000000);
  });
});

describe("hoursToMilliseconds", () => {
  it("should work", () => {
    expect(hoursToMilliseconds(1)).toBe(3600000);
    expect(hoursToMilliseconds(0)).toBe(0);
    expect(hoursToMilliseconds(2.5)).toBe(9000000);
  });
});

describe("minutesToMilliseconds", () => {
  it("should work", () => {
    expect(minutesToMilliseconds(1)).toBe(60000);
    expect(minutesToMilliseconds(0)).toBe(0);
    expect(minutesToMilliseconds(2.5)).toBe(150000);
  });
});
