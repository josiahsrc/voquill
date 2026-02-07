import { describe, expect, it } from "vitest";
import type { LlmProviderRow } from "../types/llm-provider.types";
import { selectLlmProvider } from "./ai.service";

function makeProvider(
  id: string,
  tier: number,
  createdAt = new Date(),
): LlmProviderRow {
  return {
    id,
    provider: "groq",
    name: `Provider ${id}`,
    url: "",
    api_key_encrypted: "enc",
    api_key_suffix: "1234",
    model: "llama-3",
    tier,
    pull_status: "complete",
    pull_error: null,
    created_at: createdAt,
  };
}

describe("selectLlmProvider", () => {
  it("medium request picks tier 2 provider", () => {
    const providers = [
      makeProvider("a", 2),
      makeProvider("b", 3),
    ];
    const result = selectLlmProvider(providers, "medium", 0);
    expect(result.id).toBe("a");
  });

  it("medium request falls back to tier 3 when no tier 2 providers exist", () => {
    const providers = [makeProvider("a", 3)];
    const result = selectLlmProvider(providers, "medium", 0);
    expect(result.id).toBe("a");
  });

  it("large request only picks tier 3 providers", () => {
    const providers = [
      makeProvider("a", 2),
      makeProvider("b", 3),
    ];
    const result = selectLlmProvider(providers, "large", 0);
    expect(result.id).toBe("b");
  });

  it("round-robins within a tier group", () => {
    const providers = [
      makeProvider("a", 2, new Date("2024-01-01")),
      makeProvider("b", 2, new Date("2024-01-02")),
      makeProvider("c", 3, new Date("2024-01-03")),
    ];

    const r0 = selectLlmProvider(providers, "medium", 0);
    const r1 = selectLlmProvider(providers, "medium", 1);
    const r2 = selectLlmProvider(providers, "medium", 2);

    expect(r0.id).toBe("a");
    expect(r1.id).toBe("b");
    expect(r2.id).toBe("a");
  });

  it("throws when no providers match the requested tier", () => {
    const providers = [makeProvider("a", 2)];
    expect(() => selectLlmProvider(providers, "large", 0)).toThrow(
      /No LLM providers configured for tier >= 3/,
    );
  });

  it("throws when provider list is empty", () => {
    expect(() => selectLlmProvider([], "medium", 0)).toThrow(
      /No LLM providers configured/,
    );
  });
});
