import jwt from "jsonwebtoken";
import type { AuthContext } from "@repo/types";
import { invoke, query } from "../helpers";

describe("auth", () => {
  const email = `test-${Date.now()}@example.com`;
  const password = "password123";

  it("registers a new user", async () => {
    const data = await invoke("auth/register", { email, password });

    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
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
    const refreshEmail = `refresh-${Date.now()}@example.com`;
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const data = await invoke("auth/register", { email: refreshEmail, password });
      token = data.token;
      userId = data.auth.id;
    });

    it("returns a fresh token with current auth data", async () => {
      const data = await invoke("auth/refresh", {}, token);

      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
      expect(data.auth.id).toBe(userId);
      expect(data.auth.email).toBe(refreshEmail);
      expect(data.auth.isAdmin).toBe(false);
    });

    it("reflects updated isAdmin after promotion", async () => {
      await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [userId]);

      const data = await invoke("auth/refresh", {}, token);

      expect(data.auth.isAdmin).toBe(true);
      const payload = jwt.decode(data.token) as AuthContext;
      expect(payload.isAdmin).toBe(true);
    });

    it("rejects refresh without a token", async () => {
      await expect(invoke("auth/refresh", {})).rejects.toThrow("401");
    });
  });

  it("rejects non-auth handlers without token", async () => {
    await expect(
      invoke("user/getMyUser", {})
    ).rejects.toThrow("401");
  });

  describe("Make First Admin", () => {
    const firstAdminEmail = `first-admin-${Date.now()}@example.com`;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");
    });

    it("allows a user to make themselves admin when no admins exist", async () => {
      const data = await invoke("auth/register", { email: firstAdminEmail, password });

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
    const adminEmail = `admin-${Date.now()}@example.com`;
    const targetEmail = `target-${Date.now()}@example.com`;
    let adminToken: string;
    let adminId: string;
    let targetToken: string;
    let targetId: string;

    beforeAll(async () => {
      await query("UPDATE auth SET is_admin = FALSE");

      const bootstrapData = await invoke("auth/register", { email: adminEmail, password });
      adminId = bootstrapData.auth.id;

      const targetData = await invoke("auth/register", { email: targetEmail, password });
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
});
