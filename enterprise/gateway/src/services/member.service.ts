import type { HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { requireAuth } from "../utils/auth.utils";
import { createMember, findMemberById } from "../repo/member.repo";

export async function tryInitialize(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"member/tryInitialize">> {
  const auth = requireAuth(opts.auth);
  await createMember(auth.userId);
  return {};
}

export async function getMyMember(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"member/getMyMember">> {
  const auth = requireAuth(opts.auth);
  const member = await findMemberById(auth.userId);
  return { member };
}
