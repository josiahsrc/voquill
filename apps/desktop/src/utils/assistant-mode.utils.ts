import { getAppState } from "../store";
import { getIsEnterpriseEnabled } from "./enterprise.utils";
import { getLocalStorageBool } from "./local-storage.utils";

export const ASSISTANT_MODE_ENABLED_KEY = "voquill:assistant-mode-enabled";
export const POWER_MODE_ENABLED_KEY = "voquill:power-mode-enabled";

export const getIsAssistantModeEnabled = (): boolean => {
  if (getIsEnterpriseEnabled()) {
    return getAppState().enterpriseConfig?.assistantModeEnabled ?? false;
  }
  return getLocalStorageBool(ASSISTANT_MODE_ENABLED_KEY);
};

export const getIsPowerModeEnabled = (): boolean => {
  if (getIsEnterpriseEnabled()) {
    return getAppState().enterpriseConfig?.powerModeEnabled ?? false;
  }
  return getLocalStorageBool(POWER_MODE_ENABLED_KEY);
};
