import { useAppStore } from "../store";
import {
  ASSISTANT_MODE_ENABLED_KEY,
  POWER_MODE_ENABLED_KEY,
  resolveModeEnabled,
} from "../utils/assistant-mode.utils";
import { useLocalStorage } from "./local-storage.hooks";

export function useIsAssistantModeEnabled(): boolean {
  const isEnterprise = useAppStore((state) => state.isEnterprise);
  const enterpriseEnabled = useAppStore(
    (state) => state.enterpriseConfig?.assistantModeEnabled ?? false,
  );
  const [localEnabled] = useLocalStorage<boolean>(
    ASSISTANT_MODE_ENABLED_KEY,
    false,
  );

  return resolveModeEnabled({
    isEnterprise,
    enterpriseEnabled,
    localEnabled,
  });
}

export function useIsPowerModeEnabled(): boolean {
  const isEnterprise = useAppStore((state) => state.isEnterprise);
  const enterpriseEnabled = useAppStore(
    (state) => state.enterpriseConfig?.powerModeEnabled ?? false,
  );
  const [localEnabled] = useLocalStorage<boolean>(
    POWER_MODE_ENABLED_KEY,
    false,
  );

  return resolveModeEnabled({
    isEnterprise,
    enterpriseEnabled,
    localEnabled,
  });
}
