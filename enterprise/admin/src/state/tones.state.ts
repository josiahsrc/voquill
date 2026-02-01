import type { ActionStatus } from "./login.state";

export type TonesState = {
  toneIds: string[];
  status: ActionStatus;
};

export const INITIAL_TONES_STATE: TonesState = {
  toneIds: [],
  status: "loading",
};
