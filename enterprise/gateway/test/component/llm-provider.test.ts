import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("llm provider", () => {
  afterAll(cleanupTestAuths);

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const adminEmail = `llm-admin-${Date.now()}@example.com`;
    const adminData = await createTestAuth(adminEmail);
    await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [
      adminData.auth.id,
    ]);
    const refreshed = await invoke("auth/login", {
      email: adminEmail,
      password: "password123",
    });
    adminToken = refreshed.token;

    const userEmail = `llm-user-${Date.now()}@example.com`;
    const userData = await createTestAuth(userEmail);
    userToken = userData.token;

    await query("DELETE FROM llm_providers");
  });

  it("returns empty list initially", async () => {
    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toEqual([]);
  });

  let createdId: string;

  it("creates a provider via upsert", async () => {
    await invoke(
      "llmProvider/upsert",
      {
        provider: {
          provider: "ollama",
          name: "Production Ollama",
          url: "http://ollama:11434/v1",
          apiKey: "sk-test-key-1234567890abcdef",
          model: "llama3",
          tier: 2,
        },
      },
      adminToken,
    );

    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].provider).toBe("ollama");
    expect(data.providers[0].name).toBe("Production Ollama");
    expect(data.providers[0].url).toBe("http://ollama:11434/v1");
    expect(data.providers[0].model).toBe("llama3");
    expect(data.providers[0].tier).toBe(2);
    expect(data.providers[0].apiKeySuffix).toBe("cdef");
    createdId = data.providers[0].id;
  });

  it("does not return full API key in list", async () => {
    const data = await invoke("llmProvider/list", {}, adminToken);
    const provider = data.providers[0];
    expect(provider.apiKey).toBeUndefined();
    expect(provider.apiKeyEncrypted).toBeUndefined();
    expect(provider.api_key_encrypted).toBeUndefined();
  });

  it("updates a provider via upsert with id", async () => {
    await invoke(
      "llmProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "ollama",
          name: "Updated Ollama",
          url: "http://ollama:11434/v2",
          apiKey: "sk-new-key-abcdefghijklmnop",
          model: "gpt-4-turbo",
          tier: 0,
        },
      },
      adminToken,
    );

    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Updated Ollama");
    expect(data.providers[0].url).toBe("http://ollama:11434/v2");
    expect(data.providers[0].model).toBe("gpt-4-turbo");
    expect(data.providers[0].tier).toBe(0);
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("preserves API key when upsert omits apiKey", async () => {
    await invoke(
      "llmProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "ollama",
          name: "No Key Change",
          url: "http://ollama:11434/v3",
          model: "gpt-4o",
          tier: 2,
        },
      },
      adminToken,
    );

    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("No Key Change");
    expect(data.providers[0].url).toBe("http://ollama:11434/v3");
    expect(data.providers[0].model).toBe("gpt-4o");
    expect(data.providers[0].tier).toBe(2);
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("preserves API key when upsert sends empty apiKey", async () => {
    await invoke(
      "llmProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "ollama",
          name: "Empty Key",
          url: "http://ollama:11434/v4",
          apiKey: "",
          model: "gpt-4o-mini",
          tier: 0,
        },
      },
      adminToken,
    );

    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Empty Key");
    expect(data.providers[0].model).toBe("gpt-4o-mini");
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("creates a provider without an API key", async () => {
    await invoke(
      "llmProvider/upsert",
      {
        provider: {
          provider: "ollama",
          name: "No Key Provider",
          url: "http://ollama:11434/v5",
          model: "llama3-nokey",
          tier: 2,
        },
      },
      adminToken,
    );

    const data = await invoke("llmProvider/list", {}, adminToken);
    const noKeyProvider = data.providers.find(
      (p: any) => p.name === "No Key Provider",
    );
    expect(noKeyProvider).toBeDefined();
    expect(noKeyProvider.apiKeySuffix).toBe("");
    expect(noKeyProvider.model).toBe("llama3-nokey");

    await invoke(
      "llmProvider/delete",
      { providerId: noKeyProvider.id },
      adminToken,
    );
  });

  it("deletes a provider", async () => {
    await invoke("llmProvider/delete", { providerId: createdId }, adminToken);

    const data = await invoke("llmProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(0);
  });

  it("rejects non-admin from listing", async () => {
    await expect(invoke("llmProvider/list", {}, userToken)).rejects.toThrow(
      "401",
    );
  });

  it("rejects non-admin from upserting", async () => {
    await expect(
      invoke(
        "llmProvider/upsert",
        {
          provider: {
            provider: "ollama",
            name: "Test",
            url: "https://example.com",
            apiKey: "sk-test",
            model: "gpt-4",
            tier: 2,
          },
        },
        userToken,
      ),
    ).rejects.toThrow("401");
  });

  it("rejects non-admin from deleting", async () => {
    await expect(
      invoke("llmProvider/delete", { providerId: "some-id" }, userToken),
    ).rejects.toThrow("401");
  });

  it("rejects unauthenticated requests", async () => {
    await expect(invoke("llmProvider/list", {})).rejects.toThrow("401");
  });
});
