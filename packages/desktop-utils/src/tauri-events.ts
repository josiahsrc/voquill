/**
 * Tauri event contract shared between the native Rust side and any webview
 * that wants to observe desktop key input. Keep these in sync with the
 * emitters in `voquill/apps/desktop/src-tauri/src/commands.rs` (and related).
 */

/** Emitted continuously by the native key listener while keys are held. */
export const KEYS_HELD_EVENT = "keys_held";

/**
 * Emitted once when the OS compositor bridge fires a registered hotkey action
 * (Linux/Wayland path). The payload carries the action name, not a key combo.
 */
export const BRIDGE_HOTKEY_TRIGGER_EVENT = "bridge_hotkey_trigger";

export type KeysHeldPayload = {
  keys: string[];
};

export type BridgeHotkeyTriggerPayload = {
  hotkey: string;
};
