import { useEffect, useMemo, useRef } from "react";
import { getAppState, useAppStore } from "../store";
import type { ActivationController } from "../utils/activation.utils";
import { getHotkeyCombosForAction } from "../utils/keyboard.utils";

type HoldAction = { actionName: string; controller: ActivationController };

type HotkeyHoldArgs = HoldAction & { isDisabled?: boolean };

export const useHotkeyHold = (args: HotkeyHoldArgs) => {
  const actions = useMemo(
    () => [{ actionName: args.actionName, controller: args.controller }],
    [args.actionName, args.controller],
  );
  useHotkeyHoldMany({ actions, isDisabled: args.isDisabled });
};

export const useHotkeyHoldMany = (args: {
  actions: HoldAction[];
  isDisabled?: boolean;
}) => {
  const keysHeld = useAppStore((s) => s.keysHeld);
  const isRecordingHotkey = useAppStore((state) => state.isRecordingHotkey);
  const hotkeyById = useAppStore((state) => state.hotkeyById);
  const isDisabled = Boolean(args.isDisabled || isRecordingHotkey);
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
      const isPressed = availableCombos.some((combo) =>
        matchesCombo(keysHeld, combo),
      );

      if (isDisabled) {
        wasPressedRef.current.set(action.actionName, isPressed);
        action.controller.reset();
        continue;
      }

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
  }, [keysHeld, combosByAction, args.actions, isDisabled]);

  const triggerCounts = useAppStore((s) => s.hotkeyTriggers);
  const prevTriggerCountsRef = useRef(triggerCounts);
  const pendingBridgeToggleRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const action of args.actions) {
      const prev = prevTriggerCountsRef.current[action.actionName] ?? 0;
      const curr = triggerCounts[action.actionName] ?? 0;
      const hasPendingToggle = pendingBridgeToggleRef.current.has(
        action.actionName,
      );

      if (curr > prev) {
        if (isDisabled) {
          pendingBridgeToggleRef.current.add(action.actionName);
        } else {
          pendingBridgeToggleRef.current.delete(action.actionName);
          action.controller.toggle();
        }
        continue;
      }

      if (!isDisabled && hasPendingToggle) {
        pendingBridgeToggleRef.current.delete(action.actionName);
        action.controller.toggle();
      }
    }

    prevTriggerCountsRef.current = triggerCounts;
  }, [triggerCounts, isDisabled, args.actions]);
};

export const useHotkeyFire = (args: {
  actionName: string;
  isDisabled?: boolean;
  onFire?: () => void;
}) => {
  const keysHeld = useAppStore((state) => state.keysHeld);
  const isRecordingHotkey = useAppStore((state) => state.isRecordingHotkey);
  const isDisabled = Boolean(args.isDisabled || isRecordingHotkey);
  const availableCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, args.actionName),
  );

  const previousKeysHeldRef = useRef<string[]>([]);
  const comboStateRef = useRef<Map<string, { contaminated: boolean }>>(
    new Map(),
  );
  const wasDisabledRef = useRef(false);

  useEffect(() => {
    if (isDisabled) {
      previousKeysHeldRef.current = keysHeld;
      comboStateRef.current.clear();
      wasDisabledRef.current = true;
      return;
    }
    const wasDisabled = wasDisabledRef.current;
    wasDisabledRef.current = false;

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

      if (wasDisabled && currentIncludesAll) {
        comboState.contaminated = true;
      }

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
  }, [keysHeld, availableCombos, isDisabled, args.onFire]);

  const triggerCount = useAppStore(
    (s) => s.hotkeyTriggers[args.actionName] ?? 0,
  );
  const prevTriggerCountRef = useRef(triggerCount);

  useEffect(() => {
    if (!isDisabled && triggerCount > prevTriggerCountRef.current) {
      args.onFire?.();
    }
    prevTriggerCountRef.current = triggerCount;
  }, [triggerCount, isDisabled, args.onFire]);
};
