import {
  CPU_DEVICE_VALUE,
  DEFAULT_MODEL_SIZE,
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_TRANSCRIPTION_MODE,
  type PostProcessingMode,
  type TranscriptionMode,
} from "../types/ai.types";
import { ActionStatus } from "../types/state.types";
import { ApiKey, ApiKeyProvider } from "@repo/types";

export type SettingsApiKeyProvider = ApiKeyProvider;

export type SettingsApiKey = ApiKey;

export type SettingsTranscriptionState = {
  mode: TranscriptionMode;
  modelSize: string;
  device: string;
  selectedApiKeyId: string | null;
};

export type SettingsPostProcessingState = {
  mode: PostProcessingMode;
  selectedApiKeyId: string | null;
};

export type SettingsState = {
  changePasswordDialogOpen: boolean;
  deleteAccountDialog: boolean;
  microphoneDialogOpen: boolean;
  audioDialogOpen: boolean;
  shortcutsDialogOpen: boolean;
  clearLocalDataDialogOpen: boolean;
  profileDialogOpen: boolean;
  aiTranscriptionDialogOpen: boolean;
  aiPostProcessingDialogOpen: boolean;
  aiTranscription: SettingsTranscriptionState;
  aiPostProcessing: SettingsPostProcessingState;
  apiKeys: SettingsApiKey[];
  apiKeysStatus: ActionStatus;
  hotkeyIds: string[];
  hotkeysStatus: ActionStatus;
  autoLaunchEnabled: boolean;
  autoLaunchStatus: ActionStatus;
};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  changePasswordDialogOpen: false,
  deleteAccountDialog: false,
  microphoneDialogOpen: false,
  audioDialogOpen: false,
  shortcutsDialogOpen: false,
  clearLocalDataDialogOpen: false,
  profileDialogOpen: false,
  aiTranscriptionDialogOpen: false,
  aiPostProcessingDialogOpen: false,
  aiTranscription: {
    mode: DEFAULT_TRANSCRIPTION_MODE,
    modelSize: DEFAULT_MODEL_SIZE,
    device: CPU_DEVICE_VALUE,
    selectedApiKeyId: null,
  },
  aiPostProcessing: {
    mode: DEFAULT_POST_PROCESSING_MODE,
    selectedApiKeyId: null,
  },
  apiKeys: [],
  apiKeysStatus: "idle",
  hotkeyIds: [],
  hotkeysStatus: "idle",
  autoLaunchEnabled: false,
  autoLaunchStatus: "idle",
};
