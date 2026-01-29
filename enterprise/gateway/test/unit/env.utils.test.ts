import { describe, it, expect, beforeEach } from "vitest";
import { getNumberedEnv, clearEnvCache } from "../../src/utils/env.utils";

describe("getNumberedEnv", () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("TEST_PREFIX_")) delete process.env[key];
    }
    clearEnvCache();
  });

  it("returns empty array when no env vars set", () => {
    expect(getNumberedEnv("NONEXISTENT_PREFIX")).toEqual([]);
  });

  it("returns single url", () => {
    process.env.TEST_PREFIX_0 = "http://localhost:8000";
    expect(getNumberedEnv("TEST_PREFIX")).toEqual(["http://localhost:8000"]);
  });

  it("returns multiple urls in order", () => {
    process.env.TEST_PREFIX_0 = "http://a:8000";
    process.env.TEST_PREFIX_1 = "http://b:8000";
    process.env.TEST_PREFIX_2 = "http://c:8000";
    expect(getNumberedEnv("TEST_PREFIX")).toEqual([
      "http://a:8000",
      "http://b:8000",
      "http://c:8000",
    ]);
  });

  it("stops at first gap", () => {
    process.env.TEST_PREFIX_0 = "http://a:8000";
    process.env.TEST_PREFIX_2 = "http://c:8000";
    expect(getNumberedEnv("TEST_PREFIX")).toEqual(["http://a:8000"]);
  });

  it("caches results", () => {
    process.env.TEST_PREFIX_0 = "http://a:8000";
    const first = getNumberedEnv("TEST_PREFIX");
    process.env.TEST_PREFIX_1 = "http://b:8000";
    const second = getNumberedEnv("TEST_PREFIX");
    expect(first).toBe(second);
    expect(second).toEqual(["http://a:8000"]);
  });
});
