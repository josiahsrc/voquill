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
  const comboStateRef = useRef<Map<string, { contaminated: boolean }>>(
    new Map(),
  );

  useEffect(() => {
    if (args.isDisabled) {
      previousKeysHeldRef.current = keysHeld;
      comboStateRef.current.clear();
      return;
    }

    const normalize = (key: string) => key.toLowerCase();
    const toNormalizedSet = (keys: string[]) =>
      new Set(keys.map((key) => normalize(key)));
    const getComboId = (requiredKeys: Set<string>) =>
      Array.from(requiredKeys).sort().join("+");

    const previousSet = toNormalizedSet(previousKeysHeldRef.current);
    const currentSet = toNormalizedSet(keysHeld);
    const activeComboIds = new Set<string>();

    let shouldFire = false;
    for (const combo of availableCombos) {
      if (combo.length === 0) {
        continue;
      }

      const requiredSet = toNormalizedSet(combo);
      if (requiredSet.size === 0) {
        continue;
      }

      const comboId = getComboId(requiredSet);
      activeComboIds.add(comboId);

      const comboState = comboStateRef.current.get(comboId) ?? {
        contaminated: false,
      };

      const previousIncludesAll = Array.from(requiredSet).every((key) =>
        previousSet.has(key),
      );
      const currentIncludesAll = Array.from(requiredSet).every((key) =>
        currentSet.has(key),
      );

      const previousExact =
        previousIncludesAll && previousSet.size === requiredSet.size;
      const currentExact =
        currentIncludesAll && currentSet.size === requiredSet.size;

      if (!previousIncludesAll && currentIncludesAll) {
        comboState.contaminated = false;
      }

      if (currentIncludesAll && !currentExact) {
        comboState.contaminated = true;
      }

      if (
        previousExact &&
        !currentExact &&
        !currentIncludesAll &&
        !comboState.contaminated
      ) {
        shouldFire = true;
      }

      if (!currentIncludesAll) {
        comboState.contaminated = false;
      }

      comboStateRef.current.set(comboId, comboState);

      if (shouldFire) {
        break;
      }
    }

    for (const comboId of comboStateRef.current.keys()) {
      if (!activeComboIds.has(comboId)) {
        comboStateRef.current.delete(comboId);
      }
    }

    if (shouldFire) {
      args.onFire?.();
    }

    previousKeysHeldRef.current = keysHeld;
  }, [keysHeld, availableCombos, args.isDisabled, args.onFire]);
};
