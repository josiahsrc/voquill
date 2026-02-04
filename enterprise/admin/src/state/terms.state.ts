import type { ActionStatus } from "./login.state";

export type TermsState = {
  termIds: string[];
  status: ActionStatus;
};

export const INITIAL_TERMS_STATE: TermsState = {
  termIds: [],
  status: "loading",
};
