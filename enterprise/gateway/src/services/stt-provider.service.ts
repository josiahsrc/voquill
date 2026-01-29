import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { v4 as uuid } from "uuid";
import { listProviders, upsertProvider, deleteProvider } from "../repo/provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { encryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import { UnauthorizedError } from "../utils/error.utils";

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
  const providers = await listProviders("transcription");
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

  await upsertProvider("transcription", {
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
  await deleteProvider(opts.input.providerId);
  return {};
}
