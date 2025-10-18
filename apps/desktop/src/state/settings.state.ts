import { ActionStatus } from "../types/state.types";

export type SettingsState = {
  microphoneDialogOpen: boolean;
  audioDialogOpen: boolean;
  shortcutsDialogOpen: boolean;
  clearLocalDataDialogOpen: boolean;
  hotkeyIds: string[];
  hotkeysStatus: ActionStatus;
};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  microphoneDialogOpen: false,
  audioDialogOpen: false,
  shortcutsDialogOpen: false,
  clearLocalDataDialogOpen: false,
  hotkeyIds: [],
  hotkeysStatus: "idle",
};
