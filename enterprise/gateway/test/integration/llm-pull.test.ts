import { describe, it, expect, beforeAll } from "vitest";
import { invoke, createTestLlmProvider } from "../helpers";

describe("llmProvider/pull integration", () => {
  let token: string;
  const providerId = "00000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    const email = `llm-pull-${Date.now()}@example.com`;
    const reg = await invoke("auth/register", {
      email,
      password: "password123",
    });
    await createTestLlmProvider(reg.token);
    const login = await invoke("auth/login", { email, password: "password123" });
    token = login.token;
  });

  it(
    "pulls model and returns updated provider",
    { timeout: 120_000 },
    async () => {
      const data = await invoke(
        "llmProvider/pull",
        { providerId },
        token,
      );

      expect(data.provider).not.toBeNull();
      expect(data.provider.pullStatus).toBe("complete");
      expect(data.provider.pullError).toBeNull();
    },
  );
});
