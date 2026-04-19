/**
 * Pretty labels for the rdev-style key codes surfaced by the native key
 * listener (`KeyA`, `MetaLeft`, `ArrowLeft`, …). Platform-agnostic — apps that
 * want to swap "⌘" for "⊞" on Windows or "Ctrl" for "⌃" on macOS should wrap
 * this map with their own platform-aware override.
 */
export const KEY_DISPLAY_NAMES: Record<string, string> = {
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  MetaLeft: "⌘",
  MetaRight: "⌘",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  AltLeft: "Alt",
  AltRight: "Alt",
  Function: "fn",
  Space: "Space",
  Escape: "Esc",
  Enter: "↩",
  Tab: "Tab",
  Backspace: "⌫",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

/**
 * Returns a short human-readable label for a single rdev-style key code.
 * Falls back to stripping the `Key`/`Digit` prefix so `KeyA` → `A`, `Digit1` → `1`.
 */
export const prettyKey = (key: string): string => {
  const named = KEY_DISPLAY_NAMES[key];
  if (named) return named;
  return key.replace(/^Key/, "").replace(/^Digit/, "");
};

/**
 * Joins a combo into a single pretty label, e.g. `["MetaLeft", "KeyS"]` → `"⌘ + S"`.
 */
export const prettyCombo = (keys: string[], separator = " + "): string =>
  keys.map(prettyKey).join(separator);
