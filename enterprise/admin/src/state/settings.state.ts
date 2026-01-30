import type { EnterpriseConfig, Nullable } from "@repo/types";
import type { ActionStatus } from "./login.state";

export type SettingsState = {
  serverVersion: Nullable<string>;
  enterpriseConfig: Nullable<EnterpriseConfig>;
  status: ActionStatus;
};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  serverVersion: null,
  enterpriseConfig: null,
  status: "idle",
};
