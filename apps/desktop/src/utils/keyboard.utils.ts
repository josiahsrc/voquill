import { getPlatform } from "./platform.utils";

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
}
