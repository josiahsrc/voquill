import type { Auth, AuthContext, Nullable } from "@repo/types";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./env.utils";
import { UnauthorizedError } from "./error.utils";

export function requireAuth(auth: Nullable<AuthContext>): AuthContext {
  if (!auth) {
    throw new UnauthorizedError("Authentication required");
  }
  return auth;
}

export function extractAuth(
  authHeader: string | undefined,
): Nullable<AuthContext> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret()) as AuthContext & {
      type?: string;
    };
    if (payload.type === "refresh") {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      isAdmin: payload.isAdmin ?? false,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

const TOKEN_EXPIRY = "10m";
const TOKEN_EXPIRY_MS = 10 * 60 * 1000;

const REFRESH_TOKEN_EXPIRY = "60d";
const REFRESH_TOKEN_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;

export function signAuthToken(auth: Auth): string {
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();
  return jwt.sign(
    { userId: auth.id, email: auth.email, isAdmin: auth.isAdmin, expiresAt },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY },
  );
}

export function signRefreshToken(auth: Auth): string {
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_MS,
  ).toISOString();
  return jwt.sign(
    { userId: auth.id, type: "refresh", expiresAt },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, getJwtSecret()) as {
    userId: string;
    type: string;
  };
  if (payload.type !== "refresh") {
    throw new UnauthorizedError("Invalid refresh token");
  }
  return { userId: payload.userId };
}
