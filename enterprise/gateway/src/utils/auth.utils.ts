import jwt from "jsonwebtoken";
import type { Auth, AuthContext, Nullable } from "@repo/types";
import { UnauthorizedError } from "./error.utils";
import { getJwtSecret } from "./env.utils";

export function requireAuth(auth: Nullable<AuthContext>): AuthContext {
  if (!auth) {
    throw new UnauthorizedError("Authentication required");
  }
  return auth;
}

export function extractAuth(authHeader: string | undefined): Nullable<AuthContext> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, getJwtSecret()) as AuthContext;
    return { userId: payload.userId, email: payload.email, isAdmin: payload.isAdmin ?? false, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

const TOKEN_EXPIRY = "7d";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function signAuthToken(auth: Auth): string {
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();
  return jwt.sign(
    { userId: auth.id, email: auth.email, isAdmin: auth.isAdmin, expiresAt },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY },
  );
}
