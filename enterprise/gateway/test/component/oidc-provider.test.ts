import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("oidc provider", () => {
  afterAll(cleanupTestAuths);

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const adminEmail = `oidc-admin-${Date.now()}@example.com`;
    const adminData = await createTestAuth(adminEmail);
    await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [
      adminData.auth.id,
    ]);
    const refreshed = await invoke("auth/login", {
      email: adminEmail,
      password: "password123",
    });
    adminToken = refreshed.token;

    const userEmail = `oidc-user-${Date.now()}@example.com`;
    const userData = await createTestAuth(userEmail);
    userToken = userData.token;

    await query("DELETE FROM oidc_providers");
  });

  it("returns empty list initially", async () => {
    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toEqual([]);
  });

  let createdId: string;

  it("creates a provider via upsert", async () => {
    await invoke(
      "oidcProvider/upsert",
      {
        provider: {
          name: "Keycloak",
          issuerUrl: "https://keycloak.example.com/realms/test",
          clientId: "voquill-desktop",
          clientSecret: "super-secret-key-12345",
          isEnabled: true,
        },
      },
      adminToken,
    );

    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Keycloak");
    expect(data.providers[0].issuerUrl).toBe(
      "https://keycloak.example.com/realms/test",
    );
    expect(data.providers[0].clientId).toBe("voquill-desktop");
    expect(data.providers[0].isEnabled).toBe(true);
    createdId = data.providers[0].id;
  });

  it("does not return client secret in list", async () => {
    const data = await invoke("oidcProvider/list", {}, adminToken);
    const provider = data.providers[0];
    expect(provider.clientSecret).toBeUndefined();
    expect(provider.clientSecretEncrypted).toBeUndefined();
    expect(provider.client_secret_encrypted).toBeUndefined();
  });

  it("updates a provider via upsert with id", async () => {
    await invoke(
      "oidcProvider/upsert",
      {
        provider: {
          id: createdId,
          name: "Azure AD",
          issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
          clientId: "azure-client-id",
          clientSecret: "new-secret-abcdef",
          isEnabled: false,
        },
      },
      adminToken,
    );

    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Azure AD");
    expect(data.providers[0].issuerUrl).toBe(
      "https://login.microsoftonline.com/tenant/v2.0",
    );
    expect(data.providers[0].clientId).toBe("azure-client-id");
    expect(data.providers[0].isEnabled).toBe(false);
  });

  it("preserves client secret when upsert omits clientSecret", async () => {
    await invoke(
      "oidcProvider/upsert",
      {
        provider: {
          id: createdId,
          name: "Azure AD Updated",
          issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
          clientId: "azure-client-id",
          isEnabled: true,
        },
      },
      adminToken,
    );

    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Azure AD Updated");
    expect(data.providers[0].isEnabled).toBe(true);
  });

  it("preserves client secret when upsert sends empty clientSecret", async () => {
    await invoke(
      "oidcProvider/upsert",
      {
        provider: {
          id: createdId,
          name: "Azure AD Empty",
          issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
          clientId: "azure-client-id",
          clientSecret: "",
          isEnabled: false,
        },
      },
      adminToken,
    );

    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].name).toBe("Azure AD Empty");
  });

  it("deletes a provider", async () => {
    await invoke("oidcProvider/delete", { providerId: createdId }, adminToken);

    const data = await invoke("oidcProvider/list", {}, adminToken);
    expect(data.providers).toHaveLength(0);
  });

  it("rejects non-admin from listing", async () => {
    await expect(invoke("oidcProvider/list", {}, userToken)).rejects.toThrow(
      "401",
    );
  });

  it("rejects non-admin from upserting", async () => {
    await expect(
      invoke(
        "oidcProvider/upsert",
        {
          provider: {
            name: "Test",
            issuerUrl: "https://example.com",
            clientId: "test-client",
            clientSecret: "test-secret",
            isEnabled: true,
          },
        },
        userToken,
      ),
    ).rejects.toThrow("401");
  });

  it("rejects non-admin from deleting", async () => {
    await expect(
      invoke("oidcProvider/delete", { providerId: "some-id" }, userToken),
    ).rejects.toThrow("401");
  });

  it("rejects unauthenticated requests for admin list", async () => {
    await expect(invoke("oidcProvider/list", {})).rejects.toThrow("401");
  });

  describe("listEnabled (public endpoint)", () => {
    beforeAll(async () => {
      await query("DELETE FROM oidc_providers");
      await invoke(
        "oidcProvider/upsert",
        {
          provider: {
            name: "Enabled Provider",
            issuerUrl: "https://enabled.example.com",
            clientId: "enabled-client",
            clientSecret: "enabled-secret",
            isEnabled: true,
          },
        },
        adminToken,
      );
      await invoke(
        "oidcProvider/upsert",
        {
          provider: {
            name: "Disabled Provider",
            issuerUrl: "https://disabled.example.com",
            clientId: "disabled-client",
            clientSecret: "disabled-secret",
            isEnabled: false,
          },
        },
        adminToken,
      );
    });

    it("returns only enabled providers without auth", async () => {
      const data = await invoke("oidcProvider/listEnabled", {});
      expect(data.providers).toHaveLength(1);
      expect(data.providers[0].name).toBe("Enabled Provider");
      expect(data.providers[0].isEnabled).toBe(true);
    });

    it("does not expose client secret in listEnabled", async () => {
      const data = await invoke("oidcProvider/listEnabled", {});
      const provider = data.providers[0];
      expect(provider.clientSecret).toBeUndefined();
      expect(provider.clientSecretEncrypted).toBeUndefined();
    });
  });
});
