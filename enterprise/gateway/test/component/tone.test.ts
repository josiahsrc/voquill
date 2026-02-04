import { v4 as uuid } from "uuid";
import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("tone", () => {
  afterAll(cleanupTestAuths);

  let token: string;
  let toneId1: string;
  let toneId2: string;

  beforeAll(async () => {
    const data = await createTestAuth();
    token = data.token;
    toneId1 = uuid();
    toneId2 = uuid();
  });

  it("returns empty list for a new user", async () => {
    const data = await invoke("tone/listMyTones", {}, token);
    expect(data.tones).toEqual([]);
  });

  it("creates a tone via upsertMyTone", async () => {
    await invoke(
      "tone/upsertMyTone",
      {
        tone: {
          id: toneId1,
          name: "Casual",
          promptTemplate: "Make this casual: {transcript}",
          isSystem: false,
          createdAt: Date.now(),
          sortOrder: 0,
        },
      },
      token,
    );

    const data = await invoke("tone/listMyTones", {}, token);
    expect(data.tones).toHaveLength(1);
    expect(data.tones[0].name).toBe("Casual");
    expect(data.tones[0].promptTemplate).toBe("Make this casual: {transcript}");
  });

  it("updates an existing tone via upsertMyTone", async () => {
    await invoke(
      "tone/upsertMyTone",
      {
        tone: {
          id: toneId1,
          name: "Casual Updated",
          promptTemplate: "Make this very casual: {transcript}",
          isSystem: false,
          createdAt: Date.now(),
          sortOrder: 0,
        },
      },
      token,
    );

    const data = await invoke("tone/listMyTones", {}, token);
    expect(data.tones).toHaveLength(1);
    expect(data.tones[0].name).toBe("Casual Updated");
  });

  it("creates a second tone", async () => {
    await invoke(
      "tone/upsertMyTone",
      {
        tone: {
          id: toneId2,
          name: "Formal",
          promptTemplate: "Make this formal: {transcript}",
          isSystem: false,
          createdAt: Date.now(),
          sortOrder: 1,
        },
      },
      token,
    );

    const data = await invoke("tone/listMyTones", {}, token);
    expect(data.tones).toHaveLength(2);
  });

  it("deletes a tone", async () => {
    await invoke("tone/deleteMyTone", { toneId: toneId1 }, token);

    const data = await invoke("tone/listMyTones", {}, token);
    expect(data.tones).toHaveLength(1);
    expect(data.tones[0].id).toBe(toneId2);
  });

  it("delete is idempotent for nonexistent tone", async () => {
    await invoke("tone/deleteMyTone", { toneId: "nonexistent" }, token);
  });

  it("rejects without auth token", async () => {
    await expect(invoke("tone/listMyTones", {})).rejects.toThrow("401");
  });

  describe("global tones", () => {
    let adminToken: string;
    let userToken: string;
    let globalToneId: string;

    beforeAll(async () => {
      const adminEmail = `global-tone-admin-${Date.now()}@example.com`;
      const adminData = await createTestAuth(adminEmail);
      await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [
        adminData.auth.id,
      ]);
      const refreshed = await invoke("auth/login", {
        email: adminEmail,
        password: "password123",
      });
      adminToken = refreshed.token;

      const userEmail = `global-tone-user-${Date.now()}@example.com`;
      const userData = await createTestAuth(userEmail);
      userToken = userData.token;

      globalToneId = uuid();

      await query("DELETE FROM tones WHERE is_global = TRUE");
    });

    it("rejects non-admin from listing global tones", async () => {
      await expect(
        invoke("tone/listGlobalTones", {}, userToken),
      ).rejects.toThrow("401");
    });

    it("rejects non-admin from upserting global tones", async () => {
      await expect(
        invoke(
          "tone/upsertGlobalTone",
          {
            tone: {
              id: globalToneId,
              name: "Global Tone",
              promptTemplate: "Global: {transcript}",
              isSystem: false,
              createdAt: Date.now(),
              sortOrder: 0,
            },
          },
          userToken,
        ),
      ).rejects.toThrow("401");
    });

    it("rejects non-admin from deleting global tones", async () => {
      await expect(
        invoke("tone/deleteGlobalTone", { toneId: globalToneId }, userToken),
      ).rejects.toThrow("401");
    });

    it("allows admin to create a global tone", async () => {
      await invoke(
        "tone/upsertGlobalTone",
        {
          tone: {
            id: globalToneId,
            name: "Company Tone",
            promptTemplate: "Use company voice: {transcript}",
            isSystem: false,
            createdAt: Date.now(),
            sortOrder: 0,
          },
        },
        adminToken,
      );

      const data = await invoke("tone/listGlobalTones", {}, adminToken);
      expect(data.tones).toHaveLength(1);
      expect(data.tones[0].name).toBe("Company Tone");
      expect(data.tones[0].promptTemplate).toBe(
        "Use company voice: {transcript}",
      );
    });

    it("allows admin to update a global tone", async () => {
      await invoke(
        "tone/upsertGlobalTone",
        {
          tone: {
            id: globalToneId,
            name: "Company Tone v2",
            promptTemplate: "Use updated company voice: {transcript}",
            isSystem: false,
            createdAt: Date.now(),
            sortOrder: 0,
          },
        },
        adminToken,
      );

      const data = await invoke("tone/listGlobalTones", {}, adminToken);
      expect(data.tones).toHaveLength(1);
      expect(data.tones[0].name).toBe("Company Tone v2");
    });

    it("includes global tones in listMyTones for regular users", async () => {
      const data = await invoke("tone/listMyTones", {}, userToken);
      const globalTone = data.tones.find(
        (t: { id: string }) => t.id === globalToneId,
      );
      expect(globalTone).toBeDefined();
      expect(globalTone.name).toBe("Company Tone v2");
    });

    it("allows admin to delete a global tone", async () => {
      await invoke(
        "tone/deleteGlobalTone",
        { toneId: globalToneId },
        adminToken,
      );

      const data = await invoke("tone/listGlobalTones", {}, adminToken);
      expect(data.tones).toHaveLength(0);
    });

    it("global tone no longer appears in listMyTones after deletion", async () => {
      const data = await invoke("tone/listMyTones", {}, userToken);
      const globalTone = data.tones.find(
        (t: { id: string }) => t.id === globalToneId,
      );
      expect(globalTone).toBeUndefined();
    });

    it("rejects without auth token", async () => {
      await expect(invoke("tone/listGlobalTones", {})).rejects.toThrow("401");
    });
  });
});
