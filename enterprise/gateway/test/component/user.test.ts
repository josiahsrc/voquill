import { invoke, query } from "../helpers";

describe("user", () => {
  let token: string;

  beforeAll(async () => {
    const email = `user-test-${Date.now()}@example.com`;
    const data = await invoke("auth/register", {
      email,
      password: "password123",
    });
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
      const adminData = await invoke("auth/register", {
        email: adminEmail,
        password: "password123",
      });
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
      const userData = await invoke("auth/register", {
        email: userEmail,
        password: "password123",
      });
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
  });
});
