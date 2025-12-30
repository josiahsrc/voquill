import { describe, expect, it } from "vitest";
import { getTestApiKey } from "../helpers/env.utils";

describe("Integration Tests", () => {
  it("should run a basic hello world test", () => {
    const apiKey = getTestApiKey();
    expect(apiKey).toBeTruthy();
  });
});
