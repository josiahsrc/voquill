import { getLocalStorageBool } from "./local-storage.utils";

export const ASSISTANT_MODE_ENABLED_KEY = "voquill:assistant-mode-enabled";
export const POWER_MODE_ENABLED_KEY = "voquill:power-mode-enabled";

export const getIsAssistantModeEnabled = (): boolean =>
  getLocalStorageBool(ASSISTANT_MODE_ENABLED_KEY);

export const getIsPowerModeEnabled = (): boolean =>
  getLocalStorageBool(POWER_MODE_ENABLED_KEY);
