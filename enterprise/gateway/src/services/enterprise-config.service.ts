import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import {
  getEnterpriseConfig,
  upsertEnterpriseConfig,
} from "../repo/enterprise-config.repo";
import { requireAuth } from "../utils/auth.utils";
import { getLicenseKey } from "../utils/license-key.utils";
import { requireAdmin } from "../utils/validation.utils";

export async function getEnterpriseConfigHandler(): Promise<
  HandlerOutput<"enterprise/getConfig">
> {
  const config = await getEnterpriseConfig();
  const embedded = getLicenseKey();
  return {
    config,
    license: {
      org: embedded.org,
      maxSeats: embedded.max_seats,
      issued: embedded.issued,
      expires: embedded.expires,
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
