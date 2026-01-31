import { cleanupTestAuths, createTestAuth, invoke, query } from "../helpers";

describe("enterprise config", () => {
  afterAll(cleanupTestAuths);

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const adminEmail = `ec-admin-${Date.now()}@example.com`;
    const adminData = await createTestAuth(adminEmail);
    await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [
      adminData.auth.id,
    ]);
    const refreshed = await invoke("auth/login", {
      email: adminEmail,
      password: "password123",
    });
    adminToken = refreshed.token;

    const userEmail = `ec-user-${Date.now()}@example.com`;
    const userData = await createTestAuth(userEmail);
    userToken = userData.token;

    await query(
      "DELETE FROM enterprise_config; INSERT INTO enterprise_config (id) VALUES ('default')",
    );
  });

  it("returns defaults (both false)", async () => {
    const data = await invoke("enterprise/getConfig", {}, userToken);
    expect(data.config.allowChangePostProcessing).toBe(false);
    expect(data.config.allowChangeTranscriptionMethod).toBe(false);
  });

  it("returns license from license key", async () => {
    const data = await invoke("enterprise/getConfig", {}, userToken);
    expect(data.license).toEqual({
      org: "Example Corp",
      maxSeats: 5,
      issued: "2026-01-01",
      expires: "2027-01-01",
    });
  });

  it("upsert sets booleans and get reflects changes", async () => {
    await invoke(
      "enterprise/upsertConfig",
      {
        config: {
          allowChangePostProcessing: true,
          allowChangeTranscriptionMethod: true,
        },
      },
      adminToken,
    );

    const data = await invoke("enterprise/getConfig", {}, userToken);
    expect(data.config.allowChangePostProcessing).toBe(true);
    expect(data.config.allowChangeTranscriptionMethod).toBe(true);
  });

  it("upsert can set back to false", async () => {
    await invoke(
      "enterprise/upsertConfig",
      {
        config: {
          allowChangePostProcessing: false,
          allowChangeTranscriptionMethod: false,
        },
      },
      adminToken,
    );

    const data = await invoke("enterprise/getConfig", {}, userToken);
    expect(data.config.allowChangePostProcessing).toBe(false);
    expect(data.config.allowChangeTranscriptionMethod).toBe(false);
  });

  it("upsert requires admin", async () => {
    await expect(
      invoke(
        "enterprise/upsertConfig",
        {
          config: {
            allowChangePostProcessing: true,
            allowChangeTranscriptionMethod: true,
          },
        },
        userToken,
      ),
    ).rejects.toThrow("401");
  });

  it("get does not require auth", async () => {
    await expect(invoke("enterprise/getConfig", {})).resolves.toBeDefined();
  });
});
