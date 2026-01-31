import type { ActionStatus } from "./login.state";

export type LlmProvidersState = {
  providerIds: string[];
  status: ActionStatus;
};

export const INITIAL_LLM_PROVIDERS_STATE: LlmProvidersState = {
  providerIds: [],
  status: "loading",
};
