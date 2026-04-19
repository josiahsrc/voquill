import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import {
  BRIDGE_HOTKEY_TRIGGER_EVENT,
  KEYS_HELD_EVENT,
  type BridgeHotkeyTriggerPayload,
  type KeysHeldPayload,
} from "./tauri-events";

export type UseTauriListenOptions = {
  /**
   * Called when the Tauri `listen()` promise rejects or the handler throws.
   * Defaults to logging via `console.error`. Replace in app code that wants
   * to surface these errors to the user (e.g. via a snackbar).
   */
  onError?: (error: unknown) => void;
};

/**
 * Subscribes to a Tauri event and invokes the callback with each payload.
 *
 * Latest-callback semantics — the handler ref is updated every render, so the
 * effect only tears down when `eventName` changes. Safe under React StrictMode.
 */
export const useTauriListen = <T = unknown>(
  eventName: string,
  callback: (payload: T) => void | Promise<void>,
  options?: UseTauriListenOptions,
) => {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

  const stableHandler = useCallback(
    async (e: { payload: T }) => {
      try {
        await cbRef.current(e.payload);
      } catch (error) {
        if (onErrorRef.current) {
          onErrorRef.current(error);
        } else {
          console.error(`[useTauriListen:${eventName}]`, error);
        }
      }
    },
    [eventName],
  );

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let canceled = false;

    (async () => {
      try {
        const u = await listen<T>(eventName, stableHandler);
        if (canceled) {
          u();
        } else {
          unlisten = u;
        }
      } catch (error) {
        if (onErrorRef.current) {
          onErrorRef.current(error);
        } else {
          console.warn(`[useTauriListen:${eventName}] listen failed`, error);
        }
      }
    })();

    return () => {
      canceled = true;
      if (unlisten) unlisten();
    };
  }, [eventName, stableHandler]);
};

export type UseKeysHeldListenerOptions = UseTauriListenOptions & {
  /**
   * Skip the callback when the newly-received keys array is identical to the
   * previous one. Default `true` — Rust emits this event on a timer and the
   * vast majority of ticks are duplicates.
   */
  dedupe?: boolean;
};

/**
 * Subscribes to the native key listener's `keys_held` event. Receives the
 * normalized `keys` array (always an array, never `undefined`). Consumers
 * typically pipe it straight into their state store.
 */
export const useKeysHeldListener = (
  onKeysHeld: (keys: string[]) => void,
  options?: UseKeysHeldListenerOptions,
) => {
  const dedupe = options?.dedupe !== false;
  const lastRef = useRef<string[]>([]);
  const onKeysHeldRef = useRef(onKeysHeld);
  onKeysHeldRef.current = onKeysHeld;

  const handler = useCallback(
    (payload: KeysHeldPayload) => {
      const keys = Array.isArray(payload?.keys) ? payload.keys : [];
      if (dedupe) {
        const last = lastRef.current;
        if (
          last.length === keys.length &&
          last.every((k, i) => k === keys[i])
        ) {
          return;
        }
        lastRef.current = keys;
      }
      onKeysHeldRef.current(keys);
    },
    [dedupe],
  );

  useTauriListen<KeysHeldPayload>(KEYS_HELD_EVENT, handler, {
    onError: options?.onError,
  });
};

/**
 * Subscribes to the compositor-bridge hotkey event. Receives the action name
 * that fired; consumers typically bump a per-action counter in their store
 * which `useHotkeyFire` / `useHotkeyHold` then observe via `triggerCount`.
 */
export const useBridgeHotkeyTriggerListener = (
  onTrigger: (hotkey: string) => void,
  options?: UseTauriListenOptions,
) => {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const handler = useCallback((payload: BridgeHotkeyTriggerPayload) => {
    const hotkey = payload?.hotkey;
    if (hotkey) onTriggerRef.current(hotkey);
  }, []);

  useTauriListen<BridgeHotkeyTriggerPayload>(
    BRIDGE_HOTKEY_TRIGGER_EVENT,
    handler,
    options,
  );
};
