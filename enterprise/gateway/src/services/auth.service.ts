import bcrypt from "bcrypt";
import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import {
  existsByEmail,
  findAuthByEmail,
  findAuthById,
  createAuth,
  setIsAdmin,
  hasAnyAdmin,
} from "../repo/auth.repo";
import { requireAuth, signAuthToken } from "../utils/auth.utils";
import {
  ClientError,
  ConflictError,
  UnauthorizedError,
} from "../utils/error.utils";

const SALT_ROUNDS = 10;

export async function register(
  input: HandlerInput<"auth/register">,
): Promise<HandlerOutput<"auth/register">> {
  if (await existsByEmail(input.email)) {
    throw new ConflictError("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const auth = await createAuth(input.email, passwordHash);

  return { token: signAuthToken(auth), auth };
}

export async function login(
  input: HandlerInput<"auth/login">,
): Promise<HandlerOutput<"auth/login">> {
  const row = await findAuthByEmail(input.email);

  if (!row) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await bcrypt.compare(input.password, row.password_hash);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const auth = {
    id: row.id,
    email: row.email,
    isAdmin: row.is_admin,
    createdAt: row.created_at.toISOString(),
  };

  return { token: signAuthToken(auth), auth };
}

export async function refresh(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"auth/refresh">> {
  const authCtx = requireAuth(opts.auth);
  const auth = await findAuthById(authCtx.userId);
  if (!auth) {
    throw new UnauthorizedError("User not found");
  }

  return { token: signAuthToken(auth), auth };
}

export async function makeAdmin(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"auth/makeAdmin">;
}): Promise<HandlerOutput<"auth/makeAdmin">> {
  const auth = requireAuth(opts.auth);
  const adminExists = await hasAnyAdmin();
  if (adminExists && !auth.isAdmin) {
    throw new UnauthorizedError("Admin access required");
  }

  if (adminExists && auth.userId === opts.input.userId) {
    throw new ClientError("You cannot modify your own admin status");
  }

  await setIsAdmin(opts.input.userId, opts.input.isAdmin);
  return {};
}

export async function logout(): Promise<HandlerOutput<"auth/logout">> {
  return {};
}
