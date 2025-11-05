import { Nullable } from "@repo/types";
import { getAppState } from "../store";
import { getGenerativePrefs, getHasCloudAccess, getTranscriptionPrefs } from "../utils/user.utils";
import { BaseApiKeyRepo, LocalApiKeyRepo } from "./api-key.repo";
import { BaseAuthRepo, CloudAuthRepo } from "./auth.repo";
import { BaseGenerateTextRepo, CloudGenerateTextRepo, GroqGenerateTextRepo } from "./generate-text.repo";
import { BaseHotkeyRepo, LocalHotkeyRepo } from "./hotkey.repo";
import { BaseTermRepo, CloudTermRepo, LocalTermRepo } from "./term.repo";
import { BaseTranscribeAudioRepo, CloudTranscribeAudioRepo, GroqTranscribeAudioRepo, LocalTranscribeAudioRepo } from "./transcribe-audio.repo";
import { BaseTranscriptionRepo, LocalTranscriptionRepo } from "./transcription.repo";
import { BaseUserRepo, CloudUserRepo, LocalUserRepo } from "./user.repo";
import { BaseUserPreferencesRepo, LocalUserPreferencesRepo } from "./preferences.repo";

const shouldUseCloud = () => getHasCloudAccess(getAppState());

export const getAuthRepo = (): BaseAuthRepo => {
  return new CloudAuthRepo();
};

export const getUserRepo = (): BaseUserRepo => {
  return shouldUseCloud() ? new CloudUserRepo() : new LocalUserRepo();
};

export const getUserPreferencesRepo = (): BaseUserPreferencesRepo => {
  return new LocalUserPreferencesRepo();
};

export const getTranscriptionRepo = (): BaseTranscriptionRepo => {
  return new LocalTranscriptionRepo();
};

export const getTermRepo = (): BaseTermRepo => {
  return shouldUseCloud() ? new CloudTermRepo() : new LocalTermRepo();
};

export const getHotkeyRepo = (): BaseHotkeyRepo => {
  return new LocalHotkeyRepo();
};

export const getApiKeyRepo = (): BaseApiKeyRepo => {
  return new LocalApiKeyRepo();
};

export type GenerateTextRepoOutput = {
  repo: Nullable<BaseGenerateTextRepo>;
  apiKeyId: Nullable<string>;
  warnings: string[];
};

export const getGenerateTextRepo = (): GenerateTextRepoOutput => {
  const prefs = getGenerativePrefs(getAppState());
  if (prefs.mode === "cloud") {
    return { repo: new CloudGenerateTextRepo(), apiKeyId: null, warnings: prefs.warnings };
  } else if (prefs.mode === "api") {
    return { repo: new GroqGenerateTextRepo(prefs.apiKeyValue), apiKeyId: prefs.apiKeyId, warnings: prefs.warnings };
  }

  return { repo: null, apiKeyId: null, warnings: prefs.warnings };
};

export type TranscribeAudioRepoOutput = {
  repo: BaseTranscribeAudioRepo;
  apiKeyId: Nullable<string>;
  warnings: string[];
}

export const getTranscribeAudioRepo = (): TranscribeAudioRepoOutput => {
  const prefs = getTranscriptionPrefs(getAppState());
  if (prefs.mode === "cloud") {
    return { repo: new CloudTranscribeAudioRepo(), apiKeyId: null, warnings: prefs.warnings };
  } else if (prefs.mode === "api") {
    return { repo: new GroqTranscribeAudioRepo(prefs.apiKeyValue), apiKeyId: prefs.apiKeyId, warnings: prefs.warnings };
  }

  return { repo: new LocalTranscribeAudioRepo(), apiKeyId: null, warnings: prefs.warnings };
}
