import { ActionStatus } from "../types/state.types";

export type AppsState = {
  mcpServerIds: string[];
  status: ActionStatus;
};

export const INITIAL_APPS_STATE: AppsState = {
  mcpServerIds: [],
  status: "idle",
};
