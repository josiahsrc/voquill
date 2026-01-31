import type { ActionStatus } from "./login.state";

export type SttProvidersState = {
  providerIds: string[];
  status: ActionStatus;
};

export const INITIAL_STT_PROVIDERS_STATE: SttProvidersState = {
  providerIds: [],
  status: "loading",
};
