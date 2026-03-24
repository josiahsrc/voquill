import { getAppState } from "../store";
import { getIsEnterpriseEnabled } from "./enterprise.utils";
import { getLocalStorageBool } from "./local-storage.utils";

export const ASSISTANT_MODE_ENABLED_KEY = "voquill:assistant-mode-enabled";
export const POWER_MODE_ENABLED_KEY = "voquill:power-mode-enabled";

type ModeEnabledArgs = {
  isEnterprise: boolean;
  enterpriseEnabled: boolean;
  localEnabled: boolean;
};

export const resolveModeEnabled = (args: ModeEnabledArgs): boolean => {
  if (args.isEnterprise) {
    return args.enterpriseEnabled;
  }
  return args.localEnabled;
};

export const getIsAssistantModeEnabled = (): boolean => {
  const state = getAppState();
  return resolveModeEnabled({
    isEnterprise: getIsEnterpriseEnabled(),
    enterpriseEnabled: state.enterpriseConfig?.assistantModeEnabled ?? false,
    localEnabled: getLocalStorageBool(ASSISTANT_MODE_ENABLED_KEY),
  });
};

export const getIsPowerModeEnabled = (): boolean => {
  const state = getAppState();
  return resolveModeEnabled({
    isEnterprise: getIsEnterpriseEnabled(),
    enterpriseEnabled: state.enterpriseConfig?.powerModeEnabled ?? false,
    localEnabled: getLocalStorageBool(POWER_MODE_ENABLED_KEY),
  });
};
