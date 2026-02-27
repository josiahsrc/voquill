import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { v4 as uuid } from "uuid";
import {
  listLlmProviders,
  upsertLlmProvider,
  deleteLlmProvider,
  getLlmProviderRowById,
  getLlmProviderById,
  updateLlmPullStatus,
} from "../repo/llm-provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { encryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import { NotFoundError } from "../utils/error.utils";
import { createLlmApi } from "../utils/llm-provider.utils";
import { requireAdmin } from "../utils/validation.utils";

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
    tier: provider.tier,
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

export async function pullLlmProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"llmProvider/pull">;
}): Promise<HandlerOutput<"llmProvider/pull">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const row = await getLlmProviderRowById(opts.input.providerId);
  if (!row) {
    throw new NotFoundError("LLM provider not found");
  }

  const api = createLlmApi(row);
  const result = await api.pullModel();
  if (result.done) {
    await updateLlmPullStatus(row.id, "complete", null);
  } else {
    await updateLlmPullStatus(row.id, "error", result.error ?? "Unknown error");
  }

  const provider = await getLlmProviderById(row.id);
  return { provider };
}
