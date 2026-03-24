import { useEffect } from "react";
import { produceAppState } from "../../store";
import {
  ASSISTANT_MODE_ENABLED_KEY,
  POWER_MODE_ENABLED_KEY,
} from "../../utils/assistant-mode.utils";
import { getLocalStorageBool } from "../../utils/local-storage.utils";

export const MigratorSideEffects = () => {
  useEffect(() => {
    const storage = window.localStorage;

    if (storage.getItem(ASSISTANT_MODE_ENABLED_KEY) !== null) {
      const value = getLocalStorageBool(ASSISTANT_MODE_ENABLED_KEY);
      produceAppState((draft) => {
        draft.local.assistantModeEnabled = value;
      });
      storage.removeItem(ASSISTANT_MODE_ENABLED_KEY);
    }

    if (storage.getItem(POWER_MODE_ENABLED_KEY) !== null) {
      const value = getLocalStorageBool(POWER_MODE_ENABLED_KEY);
      produceAppState((draft) => {
        draft.local.powerModeEnabled = value;
      });
      storage.removeItem(POWER_MODE_ENABLED_KEY);
    }
  }, []);

  return null;
};
