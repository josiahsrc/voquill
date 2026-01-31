import type { Nullable } from "@repo/types";
import type { ActionStatus } from "./login.state";

export type SettingsState = {
  serverVersion: Nullable<string>;
  status: ActionStatus;
};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  serverVersion: null,
  status: "loading",
};
