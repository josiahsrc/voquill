import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("stt provider", () => {
  afterAll(cleanupTestAuths);

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const adminEmail = `stt-admin-${Date.now()}@example.com`;
    const adminData = await createTestAuth(adminEmail);
    await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [adminData.auth.id]);
    const refreshed = await invoke("auth/login", {
      email: adminEmail,
      password: "password123",
    });
    adminToken = refreshed.token;

    const userEmail = `stt-user-${Date.now()}@example.com`;
    const userData = await createTestAuth(userEmail);
    userToken = userData.token;

    await query("DELETE FROM stt_providers");
  });

  it("returns empty list initially", async () => {
    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toEqual([]);
  });

  let createdId: string;

  it("creates a provider via upsert", async () => {
    await invoke(
      "sttProvider/upsert",
      {
        provider: {
          provider: "speaches",
          name: "Production Speaches",
          url: "https://api.speaches.com/v1",
          apiKey: "sk-test-key-1234567890abcdef",
          model: "whisper-1",
          tier: 1,
        },
      },
      adminToken,
    );

    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].provider).toBe("speaches");
    expect(data.providers[0].name).toBe("Production Speaches");
    expect(data.providers[0].url).toBe("https://api.speaches.com/v1");
    expect(data.providers[0].model).toBe("whisper-1");
    expect(data.providers[0].tier).toBe(1);
    expect(data.providers[0].apiKeySuffix).toBe("cdef");
    createdId = data.providers[0].id;
  });

  it("does not return full API key in list", async () => {
    const data = await invoke("sttProvider/list", {}, adminToken);
    const provider = data.providers[0];
    expect(provider.apiKey).toBeUndefined();
    expect(provider.apiKeyEncrypted).toBeUndefined();
    expect(provider.api_key_encrypted).toBeUndefined();
  });

  it("updates a provider via upsert with id", async () => {
    await invoke(
      "sttProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "speaches",
          name: "Updated Speaches",
          url: "https://api.speaches.com/v2",
          apiKey: "sk-new-key-abcdefghijklmnop",
          model: "whisper-2",
          tier: 0,
        },
      },
      adminToken,
    );

    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Updated Speaches");
    expect(data.providers[0].url).toBe("https://api.speaches.com/v2");
    expect(data.providers[0].model).toBe("whisper-2");
    expect(data.providers[0].tier).toBe(0);
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("preserves API key when upsert omits apiKey", async () => {
    await invoke(
      "sttProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "speaches",
          name: "No Key Change",
          url: "https://api.speaches.com/v3",
          model: "whisper-3",
          tier: 1,
        },
      },
      adminToken,
    );

    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("No Key Change");
    expect(data.providers[0].url).toBe("https://api.speaches.com/v3");
    expect(data.providers[0].model).toBe("whisper-3");
    expect(data.providers[0].tier).toBe(1);
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("preserves API key when upsert sends empty apiKey", async () => {
    await invoke(
      "sttProvider/upsert",
      {
        provider: {
          id: createdId,
          provider: "speaches",
          name: "Empty Key",
          url: "https://api.speaches.com/v4",
          apiKey: "",
          model: "whisper-4",
          tier: 0,
        },
      },
      adminToken,
    );

    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Empty Key");
    expect(data.providers[0].model).toBe("whisper-4");
    expect(data.providers[0].apiKeySuffix).toBe("mnop");
  });

  it("creates a provider without an API key", async () => {
    await invoke(
      "sttProvider/upsert",
      {
        provider: {
          provider: "speaches",
          name: "No Key Provider",
          url: "https://api.speaches.com/v5",
          model: "whisper-5",
          tier: 1,
        },
      },
      adminToken,
    );

    const data = await invoke("sttProvider/list", {}, adminToken);
    const noKeyProvider = data.providers.find(
      (p: any) => p.name === "No Key Provider",
    );
    expect(noKeyProvider).toBeDefined();
    expect(noKeyProvider.apiKeySuffix).toBe("");
    expect(noKeyProvider.model).toBe("whisper-5");

    await invoke(
      "sttProvider/delete",
      { providerId: noKeyProvider.id },
      adminToken,
    );
  });

  it("deletes a provider", async () => {
    await invoke("sttProvider/delete", { providerId: createdId }, adminToken);

    const data = await invoke("sttProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(0);
  });

  it("rejects non-admin from listing", async () => {
    await expect(
      invoke("sttProvider/list", {}, userToken),
    ).rejects.toThrow("401");
  });

  it("rejects non-admin from upserting", async () => {
    await expect(
      invoke(
        "sttProvider/upsert",
        {
          provider: {
            provider: "speaches",
            name: "Test",
            url: "https://example.com",
            apiKey: "sk-test",
            model: "whisper-1",
            tier: 1,
          },
        },
        userToken,
      ),
    ).rejects.toThrow("401");
  });

  it("rejects non-admin from deleting", async () => {
    await expect(
      invoke("sttProvider/delete", { providerId: "some-id" }, userToken),
    ).rejects.toThrow("401");
  });

  it("rejects unauthenticated requests", async () => {
    await expect(invoke("sttProvider/list", {})).rejects.toThrow("401");
  });
});
