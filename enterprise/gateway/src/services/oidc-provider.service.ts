import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { v4 as uuid } from "uuid";
import {
  listOidcProviders,
  upsertOidcProvider,
  deleteOidcProvider,
  listEnabledOidcProviders,
} from "../repo/oidc-provider.repo";
import { requireAuth } from "../utils/auth.utils";
import { encryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import { requireAdmin } from "../utils/validation.utils";

export async function listOidcProvidersHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"oidcProvider/list">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  const providers = await listOidcProviders();
  return { providers };
}

export async function upsertOidcProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"oidcProvider/upsert">;
}): Promise<HandlerOutput<"oidcProvider/upsert">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const { provider } = opts.input;

  const secretFields = provider.clientSecret
    ? {
        clientSecretEncrypted: encryptApiKey(
          provider.clientSecret,
          getEncryptionSecret(),
        ),
      }
    : {};

  await upsertOidcProvider({
    id: provider.id || uuid(),
    name: provider.name,
    issuerUrl: provider.issuerUrl,
    clientId: provider.clientId,
    ...secretFields,
    isEnabled: provider.isEnabled,
  });

  return {};
}

export async function deleteOidcProviderHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"oidcProvider/delete">;
}): Promise<HandlerOutput<"oidcProvider/delete">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await deleteOidcProvider(opts.input.providerId);
  return {};
}

export async function listEnabledOidcProvidersHandler(): Promise<
  HandlerOutput<"oidcProvider/listEnabled">
> {
  const providers = await listEnabledOidcProviders();
  return { providers };
}
