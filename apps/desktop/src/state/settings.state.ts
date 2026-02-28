import {
  ApiKey,
  ApiKeyProvider,
  OpenRouterModel,
  OpenRouterProvider,
} from "@repo/types";
import type {
  LocalSidecarDownloadSnapshot,
  LocalSidecarModelStatus,
} from "../utils/local-transcription-sidecar.utils";
import {
  LOCAL_WHISPER_MODELS,
  type LocalWhisperModel,
} from "../utils/local-transcription.utils";
import {
  type AgentMode,
  CPU_DEVICE_VALUE,
  DEFAULT_AGENT_MODE,
  DEFAULT_MODEL_SIZE,
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_TRANSCRIPTION_MODE,
  type PostProcessingMode,
  type TranscriptionMode,
} from "../types/ai.types";
import { ActionStatus } from "../types/state.types";

export type SettingsApiKeyProvider = ApiKeyProvider;

export type SettingsApiKey = ApiKey;

export type LocalTranscriptionModelStatusMap = Record<
  LocalWhisperModel,
  LocalSidecarModelStatus | null
>;

export type LocalTranscriptionModelManagementState = {
  modelStatuses: LocalTranscriptionModelStatusMap;
  modelStatusesLoading: boolean;
  modelStatusesLoaded: boolean;
  modelDownloads: Partial<
    Record<LocalWhisperModel, LocalSidecarDownloadSnapshot>
  >;
  modelDeletes: Partial<Record<LocalWhisperModel, boolean>>;
};

export type SettingsTranscriptionState = {
  mode: TranscriptionMode;
  modelSize: string;
  device: string;
  selectedApiKeyId: string | null;
  gpuEnumerationEnabled: boolean;
  localModelManagement: LocalTranscriptionModelManagementState;
};

export type SettingsGenerativeState = {
  mode: PostProcessingMode;
  selectedApiKeyId: string | null;
};

export type SettingsAgentModeState = Omit<SettingsGenerativeState, "mode"> & {
  mode: AgentMode;
  openclawGatewayUrl: string | null;
  openclawToken: string | null;
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
  moreSettingsDialogOpen: boolean;
  dictationLanguageDialogOpen: boolean;
  appKeybindingsDialogOpen: boolean;
  aiTranscription: SettingsTranscriptionState;
  aiPostProcessing: SettingsGenerativeState;
  agentMode: SettingsAgentModeState;
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
  autoDownloadLogs: boolean;
};

export const createEmptyLocalTranscriptionModelStatusMap =
  (): LocalTranscriptionModelStatusMap =>
    Object.fromEntries(
      LOCAL_WHISPER_MODELS.map((model) => [model, null]),
    ) as LocalTranscriptionModelStatusMap;

export const isLocalTranscriptionModelDownloadInProgress = (
  snapshot: LocalSidecarDownloadSnapshot | undefined,
): boolean => {
  return snapshot?.status === "pending" || snapshot?.status === "running";
};

export const isLocalTranscriptionModelSelectable = (
  transcription: SettingsTranscriptionState,
  model: LocalWhisperModel,
): boolean => {
  const status = transcription.localModelManagement.modelStatuses[model];
  return !!status?.downloaded && !!status?.valid;
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
  moreSettingsDialogOpen: false,
  dictationLanguageDialogOpen: false,
  appKeybindingsDialogOpen: false,
  aiTranscription: {
    mode: DEFAULT_TRANSCRIPTION_MODE,
    modelSize: DEFAULT_MODEL_SIZE,
    device: CPU_DEVICE_VALUE,
    selectedApiKeyId: null,
    gpuEnumerationEnabled: false,
    localModelManagement: {
      modelStatuses: createEmptyLocalTranscriptionModelStatusMap(),
      modelStatusesLoading: false,
      modelStatusesLoaded: false,
      modelDownloads: {},
      modelDeletes: {},
    },
  },
  aiPostProcessing: {
    mode: DEFAULT_POST_PROCESSING_MODE,
    selectedApiKeyId: null,
  },
  agentMode: {
    mode: DEFAULT_AGENT_MODE,
    selectedApiKeyId: null,
    openclawGatewayUrl: null,
    openclawToken: null,
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
  autoDownloadLogs: false,
};
