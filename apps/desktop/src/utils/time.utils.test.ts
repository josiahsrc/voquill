import { describe, expect, it } from "vitest";
import { daysToMilliseconds } from "./time.utils";

describe("daysToMilliseconds", () => {
  it("should work", () => {
    expect(daysToMilliseconds(1)).toBe(86400000);
    expect(daysToMilliseconds(0)).toBe(0);
    expect(daysToMilliseconds(2.5)).toBe(216000000);
  });
});
