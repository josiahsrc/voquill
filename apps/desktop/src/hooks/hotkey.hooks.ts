import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { getHotkeyCombosForAction } from "../utils/keyboard.utils";

const LOCK_MS = 400;

export const useHotkeyHold = (args: {
  actionName: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
}) => {
  const keysHeld = useAppStore((s) => s.keysHeld);
  const availableCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, args.actionName),
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
    const wasActive = activeRef.current;

    clearPendingDeactivation();
    activeRef.current = false;
    lockedRef.current = false;
    ignoreActivationRef.current = false;
    activationTimestampRef.current = null;
    lastReleaseRef.current = null;

    if (wasActive) {
      onDeactivateRef.current?.();
    }
  }, [clearPendingDeactivation]);

  useEffect(() => {
    return () => {
      clearPendingDeactivation();
      deactivate();
    };
  }, [clearPendingDeactivation, deactivate]);

  useEffect(() => {
    if (activeRef.current && !wasPressedRef.current) {
      activeRef.current = false;
      lockedRef.current = false;
      ignoreActivationRef.current = false;
      lastReleaseRef.current = null;
      activationTimestampRef.current = null;
    }

    if (availableCombos.length === 0) {
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

      const uniqueHeld = Array.from(new Set(held.map((key) => normalize(key))));
      const required = Array.from(new Set(combo.map((key) => normalize(key))));

      if (uniqueHeld.length !== required.length) {
        return false;
      }

      const heldSet = new Set(uniqueHeld);
      return required.every((key) => heldSet.has(key));
    };

    const isPressed = availableCombos.some((combo) =>
      matchesCombo(keysHeld, combo),
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
  }, [
    keysHeld,
    availableCombos,
    activate,
    deactivate,
    clearPendingDeactivation,
  ]);
};

export const useHotkeyFire = (args: {
  actionName: string;
  isDisabled?: boolean;
  onFire?: () => void;
}) => {
  const keysHeld = useAppStore((state) => state.keysHeld);
  const availableCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, args.actionName),
  );

  const previousKeysHeldRef = useRef<string[]>([]);

  useEffect(() => {
    if (args.isDisabled) {
      previousKeysHeldRef.current = keysHeld;
      return;
    }

    const previousKeysHeld = previousKeysHeldRef.current;

    // Check if any combo was just pressed (transition from not pressed to pressed)
    const wasComboPressed = availableCombos.some((combo) => {
      if (combo.length === 0) return false;

      const normalize = (key: string) => key.toLowerCase();
      const normalizedCombo = combo.map(normalize);
      const normalizedKeysHeld = keysHeld.map(normalize);
      const normalizedPreviousKeysHeld = previousKeysHeld.map(normalize);

      // Check if all keys in the combo are NOW held
      const allKeysNowHeld = normalizedCombo.every((key) =>
        normalizedKeysHeld.includes(key),
      );

      // Check if NOT all keys were held previously
      const notAllKeysPreviouslyHeld = !normalizedCombo.every((key) =>
        normalizedPreviousKeysHeld.includes(key),
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
