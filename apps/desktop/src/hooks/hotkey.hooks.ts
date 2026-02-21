import { useEffect, useMemo, useRef } from "react";
import { getAppState, useAppStore } from "../store";
import type { ActivationController } from "../utils/activation.utils";
import { getHotkeyCombosForAction } from "../utils/keyboard.utils";

type HoldAction = { actionName: string; controller: ActivationController };

export const useHotkeyHold = (args: HoldAction) => {
  const actions = useMemo(
    () => [{ actionName: args.actionName, controller: args.controller }],
    [args.actionName, args.controller],
  );
  useHotkeyHoldMany({ actions });
};

export const useHotkeyHoldMany = (args: { actions: HoldAction[] }) => {
  const keysHeld = useAppStore((s) => s.keysHeld);
  const hotkeyById = useAppStore((state) => state.hotkeyById);
  const combosByAction = useMemo(() => {
    const map: Record<string, string[][]> = {};
    const state = getAppState();
    for (const action of args.actions) {
      map[action.actionName] = getHotkeyCombosForAction(
        state,
        action.actionName,
      );
    }
    return map;
  }, [hotkeyById, args.actions]);

  const wasPressedRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    return () => {
      for (const action of args.actions) {
        action.controller.dispose();
      }
    };
  }, [args.actions]);

  useEffect(() => {
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

    for (const action of args.actions) {
      const availableCombos = combosByAction[action.actionName] ?? [];
      const wasPressed = wasPressedRef.current.get(action.actionName) ?? false;

      if (
        action.controller.isActive &&
        !wasPressed &&
        !action.controller.hasHadRelease
      ) {
        action.controller.forceReset();
      }

      if (availableCombos.length === 0) {
        wasPressedRef.current.set(action.actionName, false);
        action.controller.reset();
        continue;
      }

      const isPressed = availableCombos.some((combo) =>
        matchesCombo(keysHeld, combo),
      );

      if (isPressed && !wasPressed) {
        if (action.controller.shouldIgnoreActivation) {
          wasPressedRef.current.set(action.actionName, isPressed);
          continue;
        }

        action.controller.handlePress();
      } else if (!isPressed && wasPressed) {
        action.controller.clearIgnore();
        action.controller.handleRelease();
      }

      wasPressedRef.current.set(action.actionName, isPressed);
    }
  }, [keysHeld, combosByAction, args.actions]);
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
