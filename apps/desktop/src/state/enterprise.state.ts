import type { Nullable } from "@repo/types";

export type EnterpriseState = {
  token: Nullable<string>;
  gatewayUrl: Nullable<string>;
};

export const INITIAL_ENTERPRISE_STATE: EnterpriseState = {
  token: null,
  gatewayUrl: null,
};
