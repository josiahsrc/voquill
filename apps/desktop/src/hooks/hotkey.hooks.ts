import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";

const DOUBLE_TAP_LOCK_DURATION_MS = 400;

export const useHotkeyHold = (args: {
  actionName: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
}) => {
  const keysHeld = useAppStore((state) => state.keysHeld);
  const availableCombos = useAppStore((state) =>
    Object.values(state.hotkeyById).filter(
      (hotkey) =>
        hotkey.actionName === args.actionName && hotkey.keys.length > 0,
    ),
  );

  const [isLocked, setIsLocked] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const lastTapTimeRef = useRef<number>(0);

  useEffect(() => {
    // Check if any combo matches the currently held keys
    const isComboHeld = availableCombos.some((combo) => {
      if (combo.keys.length === 0) return false;
      // Check if all keys in the combo are currently held
      return combo.keys.every((key) => keysHeld.includes(key));
    });

    if (isComboHeld) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      // Check for double tap to lock
      if (timeSinceLastTap < DOUBLE_TAP_LOCK_DURATION_MS && !isLocked) {
        setIsLocked(true);
        lastTapTimeRef.current = 0; // Reset to prevent triple-tap issues
      } else {
        lastTapTimeRef.current = now;
      }

      // Activate if combo is held or locked
      if (!isActive) {
        setIsActive(true);
        args.onActivate?.();
      }
    } else {
      // If keys are released and not locked, deactivate
      if (!isLocked && isActive) {
        setIsActive(false);
        args.onDeactivate?.();
      } else if (isLocked && isActive) {
        // If locked and combo is pressed again, unlock and deactivate
        setIsLocked(false);
        setIsActive(false);
        args.onDeactivate?.();
      }
    }
  }, [keysHeld, availableCombos, isLocked, isActive, args]);
}

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
