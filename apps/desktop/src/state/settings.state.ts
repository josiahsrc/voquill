import {
  ApiKey,
  ApiKeyProvider,
  OpenRouterModel,
  OpenRouterProvider,
} from "@repo/types";
import {
  CPU_DEVICE_VALUE,
  DEFAULT_AGENT_MODE,
  DEFAULT_MODEL_SIZE,
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_TRANSCRIPTION_MODE,
  type PostProcessingMode,
  type TranscriptionMode,
} from "../types/ai.types";
import { ActionStatus } from "../types/state.types";

import { Nullable } from "@repo/types";

export type SettingsApiKeyProvider = ApiKeyProvider;

export type SettingsApiKey = ApiKey;

export type SettingsTranscriptionState = {
  mode: TranscriptionMode;
  modelSize: string;
  device: string;
  selectedApiKeyId: string | null;
  gpuEnumerationEnabled: boolean;
};

export type SettingsGenerativeState = {
  mode: PostProcessingMode;
  selectedApiKeyId: string | null;
};

export type LanguageSwitchState = {
  enabled: boolean;
  secondaryLanguage: Nullable<string>;
  hotkey: Nullable<string[]>;
  activeLanguage: "primary" | "secondary";
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
  agentModeDialogOpen: boolean;
  aiTranscription: SettingsTranscriptionState;
  aiPostProcessing: SettingsGenerativeState;
  agentMode: SettingsGenerativeState;
  languageSwitch: LanguageSwitchState;
  apiKeys: SettingsApiKey[];
  apiKeysStatus: ActionStatus;
  hotkeyIds: string[];
  hotkeysStatus: ActionStatus;
  autoLaunchEnabled: boolean;
  autoLaunchStatus: ActionStatus;
  openRouterModels: OpenRouterModel[];
  openRouterModelsStatus: ActionStatus;
  openRouterSearchQuery: string;
  openRouterProviders: OpenRouterProvider[];
  openRouterProvidersStatus: ActionStatus;
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
  agentModeDialogOpen: false,
  aiTranscription: {
    mode: DEFAULT_TRANSCRIPTION_MODE,
    modelSize: DEFAULT_MODEL_SIZE,
    device: CPU_DEVICE_VALUE,
    selectedApiKeyId: null,
    gpuEnumerationEnabled: false,
  },
  aiPostProcessing: {
    mode: DEFAULT_POST_PROCESSING_MODE,
    selectedApiKeyId: null,
  },
  agentMode: {
    mode: DEFAULT_AGENT_MODE,
    selectedApiKeyId: null,
  },
  languageSwitch: {
    enabled: false,
    secondaryLanguage: null,
    hotkey: null,
    activeLanguage: "primary",
  },
  apiKeys: [],
  apiKeysStatus: "idle",
  hotkeyIds: [],
  hotkeysStatus: "idle",
  autoLaunchEnabled: false,
  autoLaunchStatus: "idle",
  openRouterModels: [],
  openRouterModelsStatus: "idle",
  openRouterSearchQuery: "",
  openRouterProviders: [],
  openRouterProvidersStatus: "idle",
};
