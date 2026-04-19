import {
  ActivationController,
  useHotkeyFire as useHotkeyFireGeneric,
  useHotkeyHoldMany as useHotkeyHoldManyGeneric,
} from "@voquill/desktop-utils";
import { useEffect, useMemo } from "react";
import { getAppState, useAppStore } from "../store";
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
  const hotkeyTriggers = useAppStore((state) => state.hotkeyTriggers);

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

  const genericActions = useMemo(
    () =>
      args.actions.map((action) => ({
        controller: action.controller,
        combos: combosByAction[action.actionName] ?? [],
        triggerCount: hotkeyTriggers[action.actionName] ?? 0,
      })),
    [args.actions, combosByAction, hotkeyTriggers],
  );

  useEffect(() => {
    return () => {
      for (const action of args.actions) {
        action.controller.dispose();
      }
    };
  }, [args.actions]);

  useHotkeyHoldManyGeneric({
    actions: genericActions,
    keysHeld,
    isDisabled: Boolean(args.isDisabled || isRecordingHotkey),
  });
};

export const useHotkeyFire = (args: {
  actionName: string;
  isDisabled?: boolean;
  onFire?: () => void;
}) => {
  const keysHeld = useAppStore((state) => state.keysHeld);
  const isRecordingHotkey = useAppStore((state) => state.isRecordingHotkey);
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, args.actionName),
  );
  const triggerCount = useAppStore(
    (s) => s.hotkeyTriggers[args.actionName] ?? 0,
  );

  useHotkeyFireGeneric({
    combos,
    triggerCount,
    keysHeld,
    isDisabled: Boolean(args.isDisabled || isRecordingHotkey),
    onFire: args.onFire,
  });
};
