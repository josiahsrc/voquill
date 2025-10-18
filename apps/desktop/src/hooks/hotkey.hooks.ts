import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store";

const LOCK_MS = 400;

export const useHotkeyHold = (args: {
  actionName: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
}) => {
  const keysHeld = useAppStore((s) => s.keysHeld);
  const combos = useAppStore((s) =>
    Object.values(s.hotkeyById).filter(
      (h) => h.actionName === args.actionName && h.keys.length > 0,
    ),
  );

  const onActivateRef = useRef(args.onActivate);
  const onDeactivateRef = useRef(args.onDeactivate);

  useEffect(() => {
    onActivateRef.current = args.onActivate;
  }, [args.onActivate]);

  useEffect(() => {
    onDeactivateRef.current = args.onDeactivate;
  }, [args.onDeactivate]);

  const activeRef = useRef(false);
  const lockedRef = useRef(false);
  const ignoreActivationRef = useRef(false);
  const deactivateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activationTimestampRef = useRef<number | null>(null);
  const lastReleaseRef = useRef<number | null>(null);
  const wasPressedRef = useRef(false);

  const clearPendingDeactivation = useCallback(() => {
    if (deactivateTimerRef.current) {
      clearTimeout(deactivateTimerRef.current);
      deactivateTimerRef.current = null;
    }
  }, []);

  const activate = useCallback(
    (timestamp: number) => {
      if (activeRef.current) {
        return;
      }

      clearPendingDeactivation();
      activeRef.current = true;
      activationTimestampRef.current = timestamp;
      onActivateRef.current?.();
    },
    [clearPendingDeactivation],
  );

  const deactivate = useCallback(() => {
    if (!activeRef.current) {
      return;
    }

    clearPendingDeactivation();
    activeRef.current = false;
    lockedRef.current = false;
    activationTimestampRef.current = null;
    onDeactivateRef.current?.();
  }, [clearPendingDeactivation]);

  useEffect(() => {
    return () => {
      clearPendingDeactivation();
      deactivate();
    };
  }, [clearPendingDeactivation, deactivate]);

  useEffect(() => {
    if (combos.length === 0) {
      ignoreActivationRef.current = false;
      wasPressedRef.current = false;
      lastReleaseRef.current = null;
      clearPendingDeactivation();
      deactivate();
      return;
    }

    const normalize = (key: string) => key.toLowerCase();

    const matchesCombo = (held: string[], combo: string[]) => {
      if (combo.length === 0) {
        return false;
      }

      const uniqueHeld = Array.from(
        new Set(held.map((key) => normalize(key))),
      );
      const required = Array.from(
        new Set(combo.map((key) => normalize(key))),
      );

      if (uniqueHeld.length !== required.length) {
        return false;
      }

      const heldSet = new Set(uniqueHeld);
      return required.every((key) => heldSet.has(key));
    };

    const isPressed = combos.some((combo) =>
      matchesCombo(keysHeld, combo.keys),
    );
    const wasPressed = wasPressedRef.current;

    if (isPressed && !wasPressed) {
      if (ignoreActivationRef.current) {
        wasPressedRef.current = isPressed;
        return;
      }

      const now = Date.now();

      if (lockedRef.current) {
        lockedRef.current = false;
        ignoreActivationRef.current = true;
        deactivate();
        wasPressedRef.current = isPressed;
        return;
      }

      const lastRelease = lastReleaseRef.current;
      // A quick re-press before the auto-release window locks the hotkey on.
      const doubleTap =
        activeRef.current &&
        lastRelease !== null &&
        now - lastRelease <= LOCK_MS;

      clearPendingDeactivation();

      if (!activeRef.current) {
        activate(now);
      }

      if (doubleTap && activeRef.current) {
        lockedRef.current = true;
      }
    } else if (!isPressed && wasPressed) {
      ignoreActivationRef.current = false;
      lastReleaseRef.current = Date.now();

      if (!activeRef.current) {
        wasPressedRef.current = isPressed;
        return;
      }

      if (lockedRef.current) {
        wasPressedRef.current = isPressed;
        return;
      }

      const now = Date.now();
      const activatedAt = activationTimestampRef.current ?? now;
      const elapsed = now - activatedAt;
      const remaining = LOCK_MS - elapsed;

      if (remaining <= 0) {
        deactivate();
      } else {
        clearPendingDeactivation();
        deactivateTimerRef.current = setTimeout(() => {
          deactivate();
        }, remaining);
      }
    }

    wasPressedRef.current = isPressed;
  }, [keysHeld, combos, activate, deactivate, clearPendingDeactivation]);
};

export const useHotkeyFire = (args: {
  actionName: string;
  onFire?: () => void;
}) => {
  const keysHeld = useAppStore((state) => state.keysHeld);
  const availableCombos = useAppStore((state) =>
    Object.values(state.hotkeyById).filter(
      (hotkey) =>
        hotkey.actionName === args.actionName && hotkey.keys.length > 0,
    ),
  );

  const previousKeysHeldRef = useRef<string[]>([]);

  useEffect(() => {
    const previousKeysHeld = previousKeysHeldRef.current;

    // Check if any combo was just pressed (transition from not pressed to pressed)
    const wasComboPressed = availableCombos.some((combo) => {
      if (combo.keys.length === 0) return false;

      // Check if all keys in the combo are NOW held
      const allKeysNowHeld = combo.keys.every((key) => keysHeld.includes(key));

      // Check if NOT all keys were held previously
      const notAllKeysPreviouslyHeld = !combo.keys.every((key) =>
        previousKeysHeld.includes(key),
      );

      // Fire only on the transition from not-pressed to pressed
      return allKeysNowHeld && notAllKeysPreviouslyHeld;
    });

    if (wasComboPressed) {
      args.onFire?.();
    }

    // Update the ref for the next comparison
    previousKeysHeldRef.current = keysHeld;
  }, [keysHeld, availableCombos, args]);
};
