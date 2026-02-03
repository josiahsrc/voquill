import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("user", () => {
  afterAll(cleanupTestAuths);

  let token: string;

  beforeAll(async () => {
    const data = await createTestAuth();
    token = data.token;
  });

  it("returns null for a new user with no profile", async () => {
    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user).toBeNull();
  });

  it("creates a user profile via setMyUser", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Test User",
          bio: "A test bio",
          company: "Voquill",
          title: "Engineer",
          onboarded: true,
          onboardedAt: new Date().toISOString(),
          playInteractionChime: true,
          hasFinishedTutorial: false,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
        },
      },
      token
    );
  });

  it("returns the user profile after setting it", async () => {
    const data = await invoke("user/getMyUser", {}, token);

    expect(data.user).toBeDefined();
    expect(data.user.name).toBe("Test User");
    expect(data.user.bio).toBe("A test bio");
    expect(data.user.company).toBe("Voquill");
    expect(data.user.title).toBe("Engineer");
    expect(data.user.onboarded).toBe(true);
  });

  it("updates partial fields", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: false,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
        },
      },
      token
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.name).toBe("Updated Name");
    expect(data.user.playInteractionChime).toBe(false);
    expect(data.user.hasFinishedTutorial).toBe(true);
  });

  it("defaults stylingMode to null", async () => {
    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.stylingMode).toBeNull();
  });

  it("sets and retrieves stylingMode", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          stylingMode: "manual",
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.stylingMode).toBe("manual");
  });

  it("defaults selectedToneId to null", async () => {
    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.selectedToneId).toBeNull();
  });

  it("sets and retrieves selectedToneId", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          selectedToneId: "tone-123",
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.selectedToneId).toBe("tone-123");
  });

  it("defaults activeToneIds to null", async () => {
    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.activeToneIds).toBeNull();
  });

  it("sets and retrieves activeToneIds", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          activeToneIds: ["tone-a", "tone-b"],
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.activeToneIds).toEqual(["tone-a", "tone-b"]);
  });

  it("can set activeToneIds back to null", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          activeToneIds: null,
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.activeToneIds).toBeNull();
  });

  it("can set selectedToneId back to null", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          selectedToneId: null,
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.selectedToneId).toBeNull();
  });

  it("can set stylingMode back to null", async () => {
    await invoke(
      "user/setMyUser",
      {
        value: {
          id: "ignored",
          createdAt: "ignored",
          updatedAt: "ignored",
          name: "Updated Name",
          onboarded: true,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: true,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
          stylingMode: null,
        },
      },
      token,
    );

    const data = await invoke("user/getMyUser", {}, token);
    expect(data.user.stylingMode).toBeNull();
  });

  it("rejects without auth token", async () => {
    await expect(invoke("user/getMyUser", {})).rejects.toThrow("401");
  });

  describe("listAllUsers", () => {
    let adminToken: string;
    let userToken: string;
    let adminEmail: string;
    let userEmail: string;

    beforeAll(async () => {
      adminEmail = `list-users-admin-${Date.now()}@example.com`;
      const adminData = await createTestAuth(adminEmail);
      await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [adminData.auth.id]);
      const refreshed = await invoke("auth/login", {
        email: adminEmail,
        password: "password123",
      });
      adminToken = refreshed.token;

      await invoke(
        "user/setMyUser",
        {
          value: {
            id: "ignored",
            createdAt: "ignored",
            updatedAt: "ignored",
            name: "Admin User",
            onboarded: true,
            onboardedAt: null,
            playInteractionChime: true,
            hasFinishedTutorial: false,
            wordsThisMonth: 0,
            wordsThisMonthMonth: null,
            wordsTotal: 0,
          },
        },
        adminToken,
      );

      userEmail = `list-users-regular-${Date.now()}@example.com`;
      const userData = await createTestAuth(userEmail);
      userToken = userData.token;

      await invoke(
        "user/setMyUser",
        {
          value: {
            id: "ignored",
            createdAt: "ignored",
            updatedAt: "ignored",
            name: "Regular User",
            onboarded: true,
            onboardedAt: null,
            playInteractionChime: true,
            hasFinishedTutorial: false,
            wordsThisMonth: 0,
            wordsThisMonthMonth: null,
            wordsTotal: 0,
          },
        },
        userToken,
      );
    });

    it("rejects non-admin users", async () => {
      await expect(
        invoke("user/listAllUsers", {}, userToken),
      ).rejects.toThrow("401");
    });

    it("rejects unauthenticated requests", async () => {
      await expect(invoke("user/listAllUsers", {})).rejects.toThrow("401");
    });

    it("returns all users for an admin", async () => {
      const data = await invoke("user/listAllUsers", {}, adminToken);
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThanOrEqual(2);

      const admin = data.users.find((u: { email: string }) => u.email === adminEmail);
      expect(admin).toBeDefined();
      expect(admin.name).toBe("Admin User");
      expect(typeof admin.isAdmin).toBe("boolean");

      const regular = data.users.find((u: { email: string }) => u.email === userEmail);
      expect(regular).toBeDefined();
      expect(regular.name).toBe("Regular User");
      expect(typeof regular.isAdmin).toBe("boolean");
    });

    it("includes auth-only users who have no user profile", async () => {
      const authOnlyEmail = `auth-only-${Date.now()}@example.com`;
      await createTestAuth(authOnlyEmail);

      const data = await invoke("user/listAllUsers", {}, adminToken);
      const authOnly = data.users.find((u: { email: string }) => u.email === authOnlyEmail);
      expect(authOnly).toBeDefined();
      expect(authOnly.email).toBe(authOnlyEmail);
      expect(authOnly.name).toBe("");
      expect(authOnly.wordsTotal).toBe(0);
    });
  });
});
