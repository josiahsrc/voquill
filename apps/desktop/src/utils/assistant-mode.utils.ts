import { AppState } from "../state/app.state";

export const ASSISTANT_MODE_ENABLED_KEY = "voquill:assistant-mode-enabled";
export const POWER_MODE_ENABLED_KEY = "voquill:power-mode-enabled";

export const getIsAssistantModeEnabled = (state: AppState): boolean => {
  if (state.isEnterprise) {
    return state.enterpriseConfig?.assistantModeEnabled ?? false;
  }
  return state.local.assistantModeEnabled;
};

export const getIsPowerModeEnabled = (state: AppState): boolean => {
  if (state.isEnterprise) {
    return state.enterpriseConfig?.powerModeEnabled ?? false;
  }
  return state.local.powerModeEnabled;
};
