import jwt from "jsonwebtoken";
import type { AuthContext } from "@repo/types";
import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

describe("auth", () => {
  afterAll(cleanupTestAuths);

  const email = `test-${Date.now()}@example.com`;
  const password = "password123";

  it("registers a new user", async () => {
    const data = await createTestAuth(email, password);

    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
    expect(data.refreshToken).toBeDefined();
    expect(typeof data.refreshToken).toBe("string");
    expect(data.auth).toBeDefined();
    expect(data.auth.id).toBeDefined();
    expect(data.auth.email).toBe(email);
    expect(data.auth.isAdmin).toBe(false);
    expect(data.auth.createdAt).toBeDefined();
  });

  it("rejects duplicate registration", async () => {
    await expect(
      invoke("auth/register", { email, password })
    ).rejects.toThrow("409");
  });

  it("logs in with correct credentials", async () => {
    const data = await invoke("auth/login", { email, password });

    expect(data.token).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.auth).toBeDefined();
    expect(data.auth.id).toBeDefined();
    expect(data.auth.email).toBe(email);
    expect(data.auth.isAdmin).toBe(false);
  });

  it("includes isAdmin in JWT payload", async () => {
    const data = await invoke("auth/login", { email, password });
    const payload = jwt.decode(data.token) as AuthContext;

    expect(payload.userId).toBe(data.auth.id);
    expect(payload.email).toBe(email);
    expect(payload.isAdmin).toBe(false);
    expect(payload.expiresAt).toBeDefined();
    expect(new Date(payload.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects login with wrong password", async () => {
    await expect(
      invoke("auth/login", { email, password: "wrong" })
    ).rejects.toThrow("401");
  });

  it("rejects login with nonexistent email", async () => {
    await expect(
      invoke("auth/login", { email: "nobody@example.com", password })
    ).rejects.toThrow("401");
  });

  it("validates email format", async () => {
    await expect(
      invoke("auth/register", { email: "not-an-email", password })
    ).rejects.toThrow("400");
  });

  it("validates password length", async () => {
    await expect(
      invoke("auth/register", { email: "new@example.com", password: "short" })
    ).rejects.toThrow("400");
  });

  it("logs out", async () => {
    const data = await invoke("auth/logout", {});
    expect(data).toEqual({});
  });

  describe("auth/refresh", () => {
    afterAll(cleanupTestAuths);

    const refreshEmail = `refresh-${Date.now()}@example.com`;
    let refreshToken: string;
    let userId: string;

    beforeAll(async () => {
      const data = await createTestAuth(refreshEmail, password);
      refreshToken = data.refreshToken;
      userId = data.auth.id;
    });

    it("returns a fresh token with current auth data", async () => {
      const data = await invoke("auth/refresh", { refreshToken });

      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
      expect(data.refreshToken).toBeDefined();
      expect(data.auth.id).toBe(userId);
      expect(data.auth.email).toBe(refreshEmail);
      expect(data.auth.isAdmin).toBe(false);
    });

    it("reflects updated isAdmin after promotion", async () => {
      await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [userId]);

      const data = await invoke("auth/refresh", { refreshToken });

      expect(data.auth.isAdmin).toBe(true);
      const payload = jwt.decode(data.token) as AuthContext;
      expect(payload.isAdmin).toBe(true);
    });

    it("rejects refresh without a refresh token", async () => {
      await expect(invoke("auth/refresh", {})).rejects.toThrow();
    });
  });

  it("rejects non-auth handlers without token", async () => {
    await expect(
      invoke("user/getMyUser", {})
    ).rejects.toThrow("401");
  });

  describe("Make First Admin", () => {
    afterAll(cleanupTestAuths);

    const firstAdminEmail = `first-admin-${Date.now()}@example.com`;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");
    });

    it("allows a user to make themselves admin when no admins exist", async () => {
      const data = await createTestAuth(firstAdminEmail, password);

      await invoke(
        "auth/makeAdmin",
        { userId: data.auth.id, isAdmin: true },
        data.token,
      );

      const refreshed = await invoke("auth/login", { email: firstAdminEmail, password });
      expect(refreshed.auth.isAdmin).toBe(true);

      const payload = jwt.decode(refreshed.token) as AuthContext;
      expect(payload.isAdmin).toBe(true);
    });
  });

  describe("makeAdmin", () => {
    afterAll(cleanupTestAuths);

    const adminEmail = `admin-${Date.now()}@example.com`;
    const targetEmail = `target-${Date.now()}@example.com`;
    let adminToken: string;
    let adminId: string;
    let targetToken: string;
    let targetId: string;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");

      const bootstrapData = await createTestAuth(adminEmail, password);
      adminId = bootstrapData.auth.id;

      const targetData = await createTestAuth(targetEmail, password);
      targetToken = targetData.token;
      targetId = targetData.auth.id;

      await invoke("auth/makeAdmin", { userId: adminId, isAdmin: true }, targetData.token);
      const refreshed = await invoke("auth/login", { email: adminEmail, password });
      adminToken = refreshed.token;
    });

    it("rejects makeAdmin without a token", async () => {
      await expect(
        invoke("auth/makeAdmin", { userId: targetId, isAdmin: true })
      ).rejects.toThrow("401");
    });

    it("rejects makeAdmin from a non-admin user", async () => {
      await expect(
        invoke("auth/makeAdmin", { userId: targetId, isAdmin: true }, targetToken)
      ).rejects.toThrow("401");
    });

    it("allows an admin to promote another user", async () => {
      await invoke("auth/makeAdmin", { userId: targetId, isAdmin: true }, adminToken);

      const data = await invoke("auth/login", { email: targetEmail, password });
      expect(data.auth.isAdmin).toBe(true);
    });

    it("allows an admin to demote another user", async () => {
      await invoke("auth/makeAdmin", { userId: targetId, isAdmin: false }, adminToken);

      const data = await invoke("auth/login", { email: targetEmail, password });
      expect(data.auth.isAdmin).toBe(false);
    });

    it("prevents an admin from modifying their own admin status", async () => {
      await expect(
        invoke("auth/makeAdmin", { userId: adminId, isAdmin: false }, adminToken)
      ).rejects.toThrow("400");

      await expect(
        invoke("auth/makeAdmin", { userId: adminId, isAdmin: true }, adminToken)
      ).rejects.toThrow("400");
    });
  });

  describe("deleteUser", () => {
    afterAll(cleanupTestAuths);

    const adminEmail = `del-admin-${Date.now()}@example.com`;
    const targetEmail = `del-target-${Date.now()}@example.com`;
    const password = "password123";
    let adminToken: string;
    let adminId: string;
    let targetToken: string;
    let targetId: string;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");

      const adminData = await createTestAuth(adminEmail, password);
      adminId = adminData.auth.id;

      const targetData = await createTestAuth(targetEmail, password);
      targetToken = targetData.token;
      targetId = targetData.auth.id;

      await invoke("member/tryInitialize", {}, targetData.token);
      await invoke("user/setMyUser", {
        value: {
          id: targetId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          name: "Target",
          onboarded: false,
          onboardedAt: null,
          playInteractionChime: true,
          hasFinishedTutorial: false,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
        },
      }, targetData.token);
      await invoke("term/upsertMyTerm", {
        term: { id: `del-term-${Date.now()}`, createdAt: new Date().toISOString(), sourceValue: "foo", destinationValue: "bar", isReplacement: false },
      }, targetData.token);

      await invoke("auth/makeAdmin", { userId: adminId, isAdmin: true }, targetData.token);
      const refreshed = await invoke("auth/login", { email: adminEmail, password });
      adminToken = refreshed.token;
    });

    it("rejects deleteUser without a token", async () => {
      await expect(
        invoke("auth/deleteUser", { userId: targetId })
      ).rejects.toThrow("401");
    });

    it("rejects deleteUser from a non-admin user", async () => {
      await expect(
        invoke("auth/deleteUser", { userId: targetId }, targetToken)
      ).rejects.toThrow("401");
    });

    it("rejects deleting yourself", async () => {
      await expect(
        invoke("auth/deleteUser", { userId: adminId }, adminToken)
      ).rejects.toThrow("400");
    });

    it("deletes auth, user, member, and terms rows", async () => {
      await invoke("auth/deleteUser", { userId: targetId }, adminToken);

      const auth = await query("SELECT id FROM auth WHERE id = $1", [targetId]);
      expect(auth.rows.length).toBe(0);

      const users = await query("SELECT id FROM users WHERE id = $1", [targetId]);
      expect(users.rows.length).toBe(0);

      const members = await query("SELECT id FROM members WHERE id = $1", [targetId]);
      expect(members.rows.length).toBe(0);

      const terms = await query("SELECT id FROM terms WHERE user_id = $1", [targetId]);
      expect(terms.rows.length).toBe(0);
    });

    it("deleted user cannot log in", async () => {
      await expect(
        invoke("auth/login", { email: targetEmail, password })
      ).rejects.toThrow("401");
    });

    it("deletes an auth-only user with no user profile", async () => {
      const authOnly = await createTestAuth();

      const data = await invoke("user/listAllUsers", {}, adminToken);
      const listed = data.users.find((u: { id: string }) => u.id === authOnly.auth.id);
      expect(listed).toBeDefined();
      expect(listed.id).toBe(authOnly.auth.id);

      await invoke("auth/deleteUser", { userId: authOnly.auth.id }, adminToken);

      const auth = await query("SELECT id FROM auth WHERE id = $1", [authOnly.auth.id]);
      expect(auth.rows.length).toBe(0);
    });
  });

  describe("resetPassword", () => {
    afterAll(cleanupTestAuths);

    const adminEmail = `reset-admin-${Date.now()}@example.com`;
    const targetEmail = `reset-target-${Date.now()}@example.com`;
    const password = "password123";
    const newPassword = "newpassword456";
    let adminToken: string;
    let adminId: string;
    let targetToken: string;
    let targetId: string;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");

      const adminData = await createTestAuth(adminEmail, password);
      adminId = adminData.auth.id;

      const targetData = await createTestAuth(targetEmail, password);
      targetToken = targetData.token;
      targetId = targetData.auth.id;

      await invoke("auth/makeAdmin", { userId: adminId, isAdmin: true }, targetData.token);
      const refreshed = await invoke("auth/login", { email: adminEmail, password });
      adminToken = refreshed.token;
    });

    it("rejects resetPassword from a non-admin user", async () => {
      await expect(
        invoke("auth/resetPassword", { userId: targetId, password: newPassword }, targetToken)
      ).rejects.toThrow("401");
    });

    it("rejects resetting own password", async () => {
      await expect(
        invoke("auth/resetPassword", { userId: adminId, password: newPassword }, adminToken)
      ).rejects.toThrow("400");
    });

    it("rejects a short password", async () => {
      await expect(
        invoke("auth/resetPassword", { userId: targetId, password: "short" }, adminToken)
      ).rejects.toThrow("400");
    });

    it("admin can reset another user's password", async () => {
      await invoke("auth/resetPassword", { userId: targetId, password: newPassword }, adminToken);

      await expect(
        invoke("auth/login", { email: targetEmail, password })
      ).rejects.toThrow("401");

      const data = await invoke("auth/login", { email: targetEmail, password: newPassword });
      expect(data.auth.id).toBe(targetId);
    });
  });

  describe("seat limit", () => {
    beforeAll(async () => {
      await query("DELETE FROM terms");
      await query("DELETE FROM members");
      await query("DELETE FROM users");
      await query("DELETE FROM auth");
    });
    afterAll(cleanupTestAuths);

    it("allows registering up to max seats and rejects the next", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestAuth();
      }

      await expect(
        invoke("auth/register", {
          email: `seat-overflow-${Date.now()}@example.com`,
          password: "password123",
        }),
      ).rejects.toThrow("seats");
    });
  });

  describe("token types", () => {
    afterAll(cleanupTestAuths);

    const tokenEmail = `tokens-${Date.now()}@example.com`;

    it("returns distinct auth and refresh tokens on register", async () => {
      const data = await createTestAuth(tokenEmail, password);
      expect(data.token).not.toBe(data.refreshToken);

      const authPayload = jwt.decode(data.token) as Record<string, unknown>;
      expect(authPayload.userId).toBe(data.auth.id);
      expect(authPayload.email).toBe(tokenEmail);
      expect(authPayload.type).toBeUndefined();

      const refreshPayload = jwt.decode(data.refreshToken) as Record<string, unknown>;
      expect(refreshPayload.userId).toBe(data.auth.id);
      expect(refreshPayload.type).toBe("refresh");
      expect(refreshPayload.email).toBeUndefined();
    });

    it("returns distinct auth and refresh tokens on login", async () => {
      const data = await invoke("auth/login", { email: tokenEmail, password });
      expect(data.token).not.toBe(data.refreshToken);

      const refreshPayload = jwt.decode(data.refreshToken) as Record<string, unknown>;
      expect(refreshPayload.type).toBe("refresh");
    });

    it("auth token has short expiry, refresh token has long expiry", async () => {
      const data = await invoke("auth/login", { email: tokenEmail, password });

      const authPayload = jwt.decode(data.token) as { exp: number };
      const refreshPayload = jwt.decode(data.refreshToken) as { exp: number };

      const authExpiresIn = authPayload.exp * 1000 - Date.now();
      const refreshExpiresIn = refreshPayload.exp * 1000 - Date.now();

      expect(authExpiresIn).toBeLessThan(11 * 60 * 1000);
      expect(refreshExpiresIn).toBeGreaterThan(59 * 24 * 60 * 60 * 1000);
    });

    it("refresh returns a new auth token and new refresh token", async () => {
      const login = await invoke("auth/login", { email: tokenEmail, password });
      const refreshed = await invoke("auth/refresh", { refreshToken: login.refreshToken });

      expect(refreshed.token).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      expect(refreshed.token).not.toBe(login.token);
      expect(refreshed.auth.email).toBe(tokenEmail);
    });

    it("cannot use an auth token as a refresh token", async () => {
      const data = await invoke("auth/login", { email: tokenEmail, password });
      await expect(
        invoke("auth/refresh", { refreshToken: data.token })
      ).rejects.toThrow("401");
    });

    it("cannot use a refresh token as a Bearer auth token", async () => {
      const data = await invoke("auth/login", { email: tokenEmail, password });
      await expect(
        invoke("user/getMyUser", {}, data.refreshToken)
      ).rejects.toThrow("401");
    });

    it("rejects refresh with an invalid token string", async () => {
      await expect(
        invoke("auth/refresh", { refreshToken: "garbage.token.value" })
      ).rejects.toThrow();
    });
  });
});
