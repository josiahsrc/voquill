import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { v4 as uuid } from "uuid";
import {
  listLlmProviders,
  upsertLlmProvider,
  deleteLlmProvider,
} from "../repo/llm-provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { encryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import { UnauthorizedError } from "../utils/error.utils";

function requireAdmin(auth: AuthContext): void {
  if (!auth.isAdmin) {
    throw new UnauthorizedError("Admin access required");
  }
}

export async function listLlmProvidersHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"llmProvider/list">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  const providers = await listLlmProviders();
  return { providers };
}

export async function upsertLlmProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"llmProvider/upsert">;
}): Promise<HandlerOutput<"llmProvider/upsert">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const { provider } = opts.input;

  const apiKeyFields = provider.apiKey
    ? {
        apiKeyEncrypted: encryptApiKey(provider.apiKey, getEncryptionSecret()),
        apiKeySuffix: provider.apiKey.slice(-4),
      }
    : {};

  await upsertLlmProvider({
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

export async function deleteLlmProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"llmProvider/delete">;
}): Promise<HandlerOutput<"llmProvider/delete">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await deleteLlmProvider(opts.input.providerId);
  return {};
}
