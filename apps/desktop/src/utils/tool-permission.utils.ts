import { getLocalStorage } from "./local-storage.utils";

const TOOL_ALWAYS_ALLOW_PREFIX = "tool_always_allow2:";

export const getToolAlwaysAllow = (toolId: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) return false;
  return storage.getItem(`${TOOL_ALWAYS_ALLOW_PREFIX}${toolId}`) === "true";
};

export const setToolAlwaysAllow = (toolId: string, allowed: boolean): void => {
  const storage = getLocalStorage();
  if (!storage) return;
  if (allowed) {
    storage.setItem(`${TOOL_ALWAYS_ALLOW_PREFIX}${toolId}`, "true");
  } else {
    storage.removeItem(`${TOOL_ALWAYS_ALLOW_PREFIX}${toolId}`);
  }
};
