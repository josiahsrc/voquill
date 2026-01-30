import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import {
  getEnterpriseConfig,
  upsertEnterpriseConfig,
} from "../repo/enterprise-config.repo";
import { requireAuth } from "../utils/auth.utils";
import { getEmbeddedConfig } from "../utils/embedded-config.utils";
import { requireAdmin } from "../utils/validation.utils";

export async function getEnterpriseConfigHandler(opts: {
  auth: Nullable<AuthContext>;
}): Promise<HandlerOutput<"enterprise/getConfig">> {
  requireAuth(opts.auth);
  const config = await getEnterpriseConfig();
  const embedded = getEmbeddedConfig();
  return {
    config,
    license: {
      org: embedded?.org ?? "Invalid",
      maxSeats: embedded?.max_seats ?? 0,
      issued: embedded?.issued ?? "Invalid",
      expires: embedded?.expires ?? "Invalid",
    },
  };
}

export async function upsertEnterpriseConfigHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"enterprise/upsertConfig">;
}): Promise<HandlerOutput<"enterprise/upsertConfig">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);
  await upsertEnterpriseConfig(opts.input.config);
  return {};
}
