import {
  CPU_DEVICE_VALUE,
  DEFAULT_MODEL_SIZE,
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
  type PostProcessingMode,
  type ProcessingMode,
} from "../types/ai.types";
import { ActionStatus } from "../types/state.types";

export type SettingsApiKeyProvider = "groq";

export type SettingsApiKey = {
  id: string;
  name: string;
  provider: SettingsApiKeyProvider;
  key: string;
};

export type SettingsTranscriptionState = {
  mode: ProcessingMode;
  modelSize: string;
  device: string;
  selectedApiKeyId: string | null;
};

export type SettingsPostProcessingState = {
  mode: PostProcessingMode;
  selectedApiKeyId: string | null;
};

export type SettingsState = {
  microphoneDialogOpen: boolean;
  audioDialogOpen: boolean;
  shortcutsDialogOpen: boolean;
  clearLocalDataDialogOpen: boolean;
  aiTranscriptionDialogOpen: boolean;
  aiPostProcessingDialogOpen: boolean;
  aiTranscription: SettingsTranscriptionState;
  aiPostProcessing: SettingsPostProcessingState;
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
  aiTranscription: {
    mode: DEFAULT_PROCESSING_MODE,
    modelSize: DEFAULT_MODEL_SIZE,
    device: CPU_DEVICE_VALUE,
    selectedApiKeyId: null,
  },
  aiPostProcessing: {
    mode: DEFAULT_POST_PROCESSING_MODE,
    selectedApiKeyId: null,
  },
  apiKeys: [],
  hotkeyIds: [],
  hotkeysStatus: "idle",
};
