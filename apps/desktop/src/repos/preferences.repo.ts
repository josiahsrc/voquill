import {
    AgentMode,
    Nullable,
    PostProcessingMode,
    TranscriptionMode,
    UserPreferences,
} from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { LOCAL_USER_ID } from "../utils/user.utils";
import { BaseRepo } from "./base.repo";

type LocalUserPreferences = {
  userId: string;
  transcriptionMode: Nullable<TranscriptionMode>;
  transcriptionApiKeyId: Nullable<string>;
  transcriptionDevice: Nullable<string>;
  transcriptionModelSize: Nullable<string>;
  postProcessingMode: Nullable<string>;
  postProcessingApiKeyId: Nullable<string>;
  postProcessingOllamaUrl: Nullable<string>;
  postProcessingOllamaModel: Nullable<string>;
  activeToneId: Nullable<string>;
  gotStartedAt: Nullable<number>;
  gpuEnumerationEnabled: boolean;
  agentMode: Nullable<AgentMode>;
  agentModeApiKeyId: Nullable<string>;
  lastSeenFeature: Nullable<string>;
  isEnterprise: boolean;
  languageSwitchEnabled: boolean;
  secondaryDictationLanguage: Nullable<string>;
  activeDictationLanguage: Nullable<string>;
  preferredMicrophone: Nullable<string>;
  ignoreUpdateDialog: boolean;
};

// Normalize post-processing mode for backwards compatibility
// "ollama" mode is no longer supported - treat it as "none" (user needs to re-add Ollama via API keys)
const normalizePostProcessingMode = (
  mode: Nullable<string>,
): Nullable<PostProcessingMode> => {
  if (!mode) return null;
  if (mode === "api" || mode === "cloud" || mode === "none") {
    return mode;
  }
  // "ollama" or any other unknown mode falls back to "none"
  return "none";
};

const fromLocalPreferences = (
  preferences: LocalUserPreferences,
): UserPreferences => ({
  userId: preferences.userId,
  transcriptionMode: preferences.transcriptionMode,
  transcriptionApiKeyId: preferences.transcriptionApiKeyId,
  transcriptionDevice: preferences.transcriptionDevice,
  transcriptionModelSize: preferences.transcriptionModelSize,
  postProcessingMode: normalizePostProcessingMode(
    preferences.postProcessingMode,
  ),
  postProcessingApiKeyId: preferences.postProcessingApiKeyId,
  postProcessingOllamaUrl: preferences.postProcessingOllamaUrl,
  postProcessingOllamaModel: preferences.postProcessingOllamaModel,
  activeToneId: preferences.activeToneId,
  gotStartedAt: preferences.gotStartedAt,
  gpuEnumerationEnabled: preferences.gpuEnumerationEnabled,
  agentMode: preferences.agentMode,
  agentModeApiKeyId: preferences.agentModeApiKeyId,
  lastSeenFeature: preferences.lastSeenFeature,
  isEnterprise: preferences.isEnterprise,
  languageSwitchEnabled: preferences.languageSwitchEnabled ?? false,
  secondaryDictationLanguage: preferences.secondaryDictationLanguage ?? null,
  activeDictationLanguage:
    (preferences.activeDictationLanguage as "primary" | "secondary") ??
    "primary",
  preferredMicrophone: preferences.preferredMicrophone ?? null,
  ignoreUpdateDialog: preferences.ignoreUpdateDialog ?? false,
});

const toLocalPreferences = (
  preferences: UserPreferences,
): LocalUserPreferences => ({
  userId: LOCAL_USER_ID,
  transcriptionMode: preferences.transcriptionMode ?? null,
  transcriptionApiKeyId: preferences.transcriptionApiKeyId ?? null,
  transcriptionDevice: preferences.transcriptionDevice ?? null,
  transcriptionModelSize: preferences.transcriptionModelSize ?? null,
  postProcessingMode: preferences.postProcessingMode ?? null,
  postProcessingApiKeyId: preferences.postProcessingApiKeyId ?? null,
  postProcessingOllamaUrl: preferences.postProcessingOllamaUrl ?? null,
  postProcessingOllamaModel: preferences.postProcessingOllamaModel ?? null,
  activeToneId: preferences.activeToneId ?? null,
  gotStartedAt: preferences.gotStartedAt ?? null,
  gpuEnumerationEnabled: preferences.gpuEnumerationEnabled,
  agentMode: preferences.agentMode ?? null,
  agentModeApiKeyId: preferences.agentModeApiKeyId ?? null,
  lastSeenFeature: preferences.lastSeenFeature ?? null,
  isEnterprise: preferences.isEnterprise,
  languageSwitchEnabled: preferences.languageSwitchEnabled ?? false,
  secondaryDictationLanguage: preferences.secondaryDictationLanguage ?? null,
  activeDictationLanguage: preferences.activeDictationLanguage ?? "primary",
  preferredMicrophone: preferences.preferredMicrophone ?? null,
  ignoreUpdateDialog: preferences.ignoreUpdateDialog ?? false,
});

export abstract class BaseUserPreferencesRepo extends BaseRepo {
  abstract setUserPreferences(
    preferences: UserPreferences,
  ): Promise<UserPreferences>;
  abstract getUserPreferences(): Promise<Nullable<UserPreferences>>;
}

export class LocalUserPreferencesRepo extends BaseUserPreferencesRepo {
  async setUserPreferences(
    preferences: UserPreferences,
  ): Promise<UserPreferences> {
    const saved = await invoke<LocalUserPreferences>("user_preferences_set", {
      preferences: toLocalPreferences(preferences),
    });

    return fromLocalPreferences(saved);
  }

  async getUserPreferences(): Promise<Nullable<UserPreferences>> {
    const result = await invoke<Nullable<LocalUserPreferences>>(
      "user_preferences_get",
      {
        args: { userId: LOCAL_USER_ID },
      },
    );

    return result ? fromLocalPreferences(result) : null;
  }
}
