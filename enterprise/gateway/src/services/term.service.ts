import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { requireAuth } from "../utils/auth.utils";
import { listTermsByUserId, upsertTerm, deleteTerm, listGlobalTerms, upsertGlobalTerm, deleteGlobalTerm } from "../repo/term.repo";
import { requireAdmin } from "../utils/validation.utils";

export async function listMyTerms(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"term/listMyTerms">> {
  const auth = requireAuth(opts.auth);
  const terms = await listTermsByUserId(auth.userId);
  return { terms };
}

export async function upsertMyTerm(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"term/upsertMyTerm">;
}): Promise<HandlerOutput<"term/upsertMyTerm">> {
  const auth = requireAuth(opts.auth);
  await upsertTerm(auth.userId, opts.input.term);
  return {};
}

export async function deleteMyTerm(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"term/deleteMyTerm">;
}): Promise<HandlerOutput<"term/deleteMyTerm">> {
  const auth = requireAuth(opts.auth);
  await deleteTerm(auth.userId, opts.input.termId);
  return {};
}

export async function listGlobalTermsHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"term/listGlobalTerms">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  const terms = await listGlobalTerms();
  return { terms };
}

export async function upsertGlobalTermHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"term/upsertGlobalTerm">;
}): Promise<HandlerOutput<"term/upsertGlobalTerm">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await upsertGlobalTerm(auth.userId, opts.input.term);
  return {};
}

export async function deleteGlobalTermHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"term/deleteGlobalTerm">;
}): Promise<HandlerOutput<"term/deleteGlobalTerm">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await deleteGlobalTerm(opts.input.termId);
  return {};
}
