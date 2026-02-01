import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { findUserById, listAllUsers, upsertUser } from "../repo/user.repo";
import { requireAuth } from "../utils/auth.utils";
import { UnauthorizedError } from "../utils/error.utils";

export async function setMyUser(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"user/setMyUser">;
}): Promise<HandlerOutput<"user/setMyUser">> {
  const auth = requireAuth(opts.auth);
  await upsertUser(auth.userId, opts.input.value);
  return {};
}

export async function listAllUsersHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"user/listAllUsers">> {
  const auth = requireAuth(opts.auth);
  if (!auth.isAdmin) {
    throw new UnauthorizedError("Admin access required");
  }
  const users = await listAllUsers();
  return { users };
}

export async function getMyUser(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"user/getMyUser">> {
  const auth = requireAuth(opts.auth);
  const user = await findUserById(auth.userId);
  return { user };
}
