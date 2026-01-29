import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { v4 as uuid } from "uuid";
import {
  listSttProviders,
  upsertSttProvider,
  deleteSttProvider,
  getSttProviderRowById,
  getSttProviderById,
  updateSttPullStatus,
} from "../repo/stt-provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { encryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import { NotFoundError, UnauthorizedError } from "../utils/error.utils";
import { createTranscriptionApi } from "../utils/stt-provider.utils";

function requireAdmin(auth: AuthContext): void {
  if (!auth.isAdmin) {
    throw new UnauthorizedError("Admin access required");
  }
}

export async function listSttProvidersHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"sttProvider/list">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  const providers = await listSttProviders();
  return { providers };
}

export async function upsertSttProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"sttProvider/upsert">;
}): Promise<HandlerOutput<"sttProvider/upsert">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const { provider } = opts.input;

  const apiKeyFields = provider.apiKey
    ? {
        apiKeyEncrypted: encryptApiKey(provider.apiKey, getEncryptionSecret()),
        apiKeySuffix: provider.apiKey.slice(-4),
      }
    : {};

  await upsertSttProvider({
    id: provider.id || uuid(),
    provider: provider.provider,
    name: provider.name,
    url: provider.url,
    ...apiKeyFields,
    model: provider.model,
    isEnabled: provider.isEnabled,
  });

  return {};
}

export async function deleteSttProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"sttProvider/delete">;
}): Promise<HandlerOutput<"sttProvider/delete">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await deleteSttProvider(opts.input.providerId);
  return {};
}

export async function pullSttProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"sttProvider/pull">;
}): Promise<HandlerOutput<"sttProvider/pull">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const row = await getSttProviderRowById(opts.input.providerId);
  if (!row) {
    throw new NotFoundError("STT provider not found");
  }

  const api = createTranscriptionApi(row);
  const result = await api.pullModel();
  if (result.done) {
    await updateSttPullStatus(row.id, "complete", null);
  } else {
    await updateSttPullStatus(row.id, "error", result.error ?? "Unknown error");
  }

  const provider = await getSttProviderById(row.id);
  return { provider };
}
