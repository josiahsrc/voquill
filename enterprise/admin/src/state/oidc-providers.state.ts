import type { ActionStatus } from "./login.state";

export type OidcProvidersState = {
  providerIds: string[];
  status: ActionStatus;
};

export const INITIAL_OIDC_PROVIDERS_STATE: OidcProvidersState = {
  providerIds: [],
  status: "loading",
};
