import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { requireAuth } from "../utils/auth.utils";
import { listTonesByUserId, upsertTone, deleteTone, listGlobalTones, upsertGlobalTone, deleteGlobalTone } from "../repo/tone.repo";
import { requireAdmin } from "../utils/validation.utils";

export async function listMyTones(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"tone/listMyTones">> {
  const auth = requireAuth(opts.auth);
  const tones = await listTonesByUserId(auth.userId);
  return { tones };
}

export async function upsertMyTone(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"tone/upsertMyTone">;
}): Promise<HandlerOutput<"tone/upsertMyTone">> {
  const auth = requireAuth(opts.auth);
  await upsertTone(auth.userId, opts.input.tone);
  return {};
}

export async function deleteMyTone(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"tone/deleteMyTone">;
}): Promise<HandlerOutput<"tone/deleteMyTone">> {
  const auth = requireAuth(opts.auth);
  await deleteTone(auth.userId, opts.input.toneId);
  return {};
}

export async function listGlobalTonesHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"tone/listGlobalTones">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  const tones = await listGlobalTones();
  return { tones };
}

export async function upsertGlobalToneHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"tone/upsertGlobalTone">;
}): Promise<HandlerOutput<"tone/upsertGlobalTone">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await upsertGlobalTone(auth.userId, opts.input.tone);
  return {};
}

export async function deleteGlobalToneHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"tone/deleteGlobalTone">;
}): Promise<HandlerOutput<"tone/deleteGlobalTone">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await deleteGlobalTone(opts.input.toneId);
  return {};
}
