import { describe, it, expect, beforeAll } from "vitest";
import { invoke, createTestSttProvider } from "../helpers";

describe("sttProvider/pull integration", () => {
  let token: string;
  const providerId = "00000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    const email = `stt-pull-${Date.now()}@example.com`;
    const reg = await invoke("auth/register", {
      email,
      password: "password123",
    });
    await createTestSttProvider(reg.token);
    const login = await invoke("auth/login", { email, password: "password123" });
    token = login.token;
  });

  it(
    "pulls model and returns updated provider",
    { timeout: 120_000 },
    async () => {
      await fetch("http://speaches:8000/v1/models/Systran/faster-whisper-base", {
        method: "DELETE",
      }).catch(() => {});

      const data = await invoke(
        "sttProvider/pull",
        { providerId },
        token,
      );

      expect(data.provider).not.toBeNull();
      expect(data.provider.pullStatus).toBe("complete");
      expect(data.provider.pullError).toBeNull();
    },
  );
});
