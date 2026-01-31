import type { Auth, AuthContext } from "@repo/types";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  extractAuth,
  requireAuth,
  signAuthToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./auth.utils";

const SECRET = "development-secret";

const mockAuth: Auth = {
  id: "user-123",
  email: "test@example.com",
  isAdmin: false,
  createdAt: new Date().toISOString(),
};

describe("signAuthToken", () => {
  it("produces a valid JWT with correct payload fields", () => {
    const token = signAuthToken(mockAuth);
    const payload = jwt.verify(token, SECRET) as AuthContext;

    expect(payload.userId).toBe(mockAuth.id);
    expect(payload.email).toBe(mockAuth.email);
    expect(payload.isAdmin).toBe(false);
    expect(payload.expiresAt).toBeDefined();
  });

  it("sets expiry to 10 minutes", () => {
    const before = Date.now();
    const token = signAuthToken(mockAuth);
    const payload = jwt.decode(token) as AuthContext & { exp: number };

    const expiresIn = payload.exp * 1000 - before;
    expect(expiresIn).toBeGreaterThan(9 * 60 * 1000);
    expect(expiresIn).toBeLessThanOrEqual(10 * 60 * 1000 + 1000);
  });

  it("includes isAdmin: true for admin users", () => {
    const token = signAuthToken({ ...mockAuth, isAdmin: true });
    const payload = jwt.verify(token, SECRET) as AuthContext;
    expect(payload.isAdmin).toBe(true);
  });
});

describe("signRefreshToken", () => {
  it("produces a valid JWT with type=refresh", () => {
    const token = signRefreshToken(mockAuth);
    const payload = jwt.verify(token, SECRET) as {
      userId: string;
      type: string;
    };

    expect(payload.userId).toBe(mockAuth.id);
    expect(payload.type).toBe("refresh");
  });

  it("sets expiry to 60 days", () => {
    const before = Date.now();
    const token = signRefreshToken(mockAuth);
    const payload = jwt.decode(token) as { exp: number };

    const expiresIn = payload.exp * 1000 - before;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    expect(expiresIn).toBeGreaterThan(sixtyDaysMs - 5000);
    expect(expiresIn).toBeLessThanOrEqual(sixtyDaysMs + 1000);
  });

  it("does not include email or isAdmin", () => {
    const token = signRefreshToken(mockAuth);
    const payload = jwt.decode(token) as Record<string, unknown>;

    expect(payload.email).toBeUndefined();
    expect(payload.isAdmin).toBeUndefined();
  });
});

describe("verifyRefreshToken", () => {
  it("returns userId from a valid refresh token", () => {
    const token = signRefreshToken(mockAuth);
    const result = verifyRefreshToken(token);
    expect(result.userId).toBe(mockAuth.id);
  });

  it("rejects an auth token used as a refresh token", () => {
    const token = signAuthToken(mockAuth);
    expect(() => verifyRefreshToken(token)).toThrow("Invalid refresh token");
  });

  it("rejects an expired refresh token", () => {
    const token = jwt.sign({ userId: mockAuth.id, type: "refresh" }, SECRET, {
      expiresIn: "0s",
    });
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it("rejects a token signed with the wrong secret", () => {
    const token = jwt.sign(
      { userId: mockAuth.id, type: "refresh" },
      "wrong-secret",
      { expiresIn: "60d" },
    );
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it("rejects a malformed token", () => {
    expect(() => verifyRefreshToken("not-a-jwt")).toThrow();
  });
});

describe("extractAuth", () => {
  it("extracts auth context from a valid Bearer token", () => {
    const token = signAuthToken(mockAuth);
    const result = extractAuth(`Bearer ${token}`);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(mockAuth.id);
    expect(result!.email).toBe(mockAuth.email);
    expect(result!.isAdmin).toBe(false);
  });

  it("returns null for missing header", () => {
    expect(extractAuth(undefined)).toBeNull();
  });

  it("returns null for non-Bearer header", () => {
    expect(extractAuth("Basic abc123")).toBeNull();
  });

  it("returns null for expired token", () => {
    const token = jwt.sign(
      {
        userId: "u1",
        email: "e@e.com",
        isAdmin: false,
        expiresAt: new Date().toISOString(),
      },
      SECRET,
      { expiresIn: "0s" },
    );
    expect(extractAuth(`Bearer ${token}`)).toBeNull();
  });

  it("returns null for invalid signature", () => {
    const token = jwt.sign({ userId: "u1" }, "wrong-secret", {
      expiresIn: "1h",
    });
    expect(extractAuth(`Bearer ${token}`)).toBeNull();
  });

  it("defaults isAdmin to false when not present", () => {
    const token = jwt.sign(
      { userId: "u1", email: "e@e.com", expiresAt: new Date().toISOString() },
      SECRET,
      { expiresIn: "1h" },
    );
    const result = extractAuth(`Bearer ${token}`);
    expect(result!.isAdmin).toBe(false);
  });
});

describe("requireAuth", () => {
  it("returns auth when present", () => {
    const ctx: AuthContext = {
      userId: "u1",
      email: "e@e.com",
      isAdmin: false,
      expiresAt: "",
    };
    expect(requireAuth(ctx)).toBe(ctx);
  });

  it("throws UnauthorizedError when null", () => {
    expect(() => requireAuth(null)).toThrow("Authentication required");
  });
});
