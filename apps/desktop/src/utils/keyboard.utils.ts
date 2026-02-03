import { AppState } from "../state/app.state";
import { getPlatform } from "./platform.utils";

export const DICTATE_HOTKEY = "dictate";
export const AGENT_DICTATE_HOTKEY = "agent-dictate";
export const LANGUAGE_SWITCH_HOTKEY = "language-switch";
export const SWITCH_WRITING_STYLE_HOTKEY = "switch-writing-style";

export const getPrettyKeyName = (key: string): string => {
  const lower = key.toLowerCase();
  if (lower.startsWith("key")) {
    return key.slice(3).toUpperCase();
  }

  if (lower.startsWith("meta")) {
    return getPlatform() === "macos" ? "⌘" : "⊞";
  }

  if (lower.startsWith("control")) {
    return getPlatform() === "macos" ? "⌃" : "Ctrl";
  }

  if (lower.startsWith("shift")) {
    return getPlatform() === "macos" ? "⇧" : "Shift";
  }

  if (lower.startsWith("alt") || lower.startsWith("option")) {
    return getPlatform() === "macos" ? "⌥" : "Alt";
  }

  if (lower.startsWith("function")) {
    return "Fn";
  }

  return key;
};

type PlatformHotkeyCombos = {
  macos: string[][];
  windows: string[][];
  linux: string[][];
};

export const DEFAULT_HOTKEY_COMBOS: Record<string, PlatformHotkeyCombos> = {
  [DICTATE_HOTKEY]: {
    macos: [["Function"]],
    windows: [["MetaLeft", "ControlLeft"]],
    linux: [["MetaLeft", "ControlLeft"]],
  },
  [LANGUAGE_SWITCH_HOTKEY]: {
    macos: [["controlLeft", "ShiftLeft", "KeyL"]],
    windows: [["ControlLeft", "ShiftLeft", "KeyL"]],
    linux: [["ControlLeft", "ShiftLeft", "KeyL"]],
  },
};

export const getHasDefaultHotkeyForAction = (actionName: string): boolean => {
  return Boolean(DEFAULT_HOTKEY_COMBOS[actionName]);
};

export const getDefaultHotkeyCombosForAction = (
  actionName: string,
): string[][] => {
  const defaultCombos = DEFAULT_HOTKEY_COMBOS[actionName];
  if (defaultCombos) {
    if (getPlatform() === "macos") {
      return defaultCombos.macos;
    } else if (getPlatform() === "windows") {
      return defaultCombos.windows;
    } else {
      return defaultCombos.linux;
    }
  }
  return [];
};

export const getHotkeyCombosForAction = (
  state: AppState,
  actionName: string,
): string[][] => {
  const combos = Object.values(state.hotkeyById)
    .filter((h) => h.actionName === actionName && h.keys.length > 0)
    .map((h) => h.keys);

  if (combos.length > 0) {
    return combos;
  }

  return getDefaultHotkeyCombosForAction(actionName);
};
