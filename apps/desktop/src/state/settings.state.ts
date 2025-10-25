import { ActionStatus } from "../types/state.types";

export type SettingsApiKeyProvider = "groq";

export type SettingsApiKey = {
  id: string;
  name: string;
  provider: SettingsApiKeyProvider;
  key: string;
};

export type SettingsState = {
  microphoneDialogOpen: boolean;
  audioDialogOpen: boolean;
  shortcutsDialogOpen: boolean;
  clearLocalDataDialogOpen: boolean;
  aiTranscriptionDialogOpen: boolean;
  aiPostProcessingDialogOpen: boolean;
  apiKeys: SettingsApiKey[];
  hotkeyIds: string[];
  hotkeysStatus: ActionStatus;
};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  microphoneDialogOpen: false,
  audioDialogOpen: false,
  shortcutsDialogOpen: false,
  clearLocalDataDialogOpen: false,
  aiTranscriptionDialogOpen: false,
  aiPostProcessingDialogOpen: false,
  apiKeys: [],
  hotkeyIds: [],
  hotkeysStatus: "idle",
};
