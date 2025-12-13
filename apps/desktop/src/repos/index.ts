import { Nullable } from "@repo/types";
import { getAppState } from "../store";
import { OLLAMA_DEFAULT_URL } from "../utils/ollama.utils";
import {
  getGenerativePrefs,
  getHasCloudAccess,
  getTranscriptionPrefs,
} from "../utils/user.utils";
import { BaseApiKeyRepo, LocalApiKeyRepo } from "./api-key.repo";
import { BaseAppTargetRepo, LocalAppTargetRepo } from "./app-target.repo";
import { BaseAuthRepo, CloudAuthRepo } from "./auth.repo";
import {
  BaseGenerateTextRepo,
  CloudGenerateTextRepo,
  GroqGenerateTextRepo,
  OllamaGenerateTextRepo,
  OpenAIGenerateTextRepo,
} from "./generate-text.repo";
import { BaseHotkeyRepo, LocalHotkeyRepo } from "./hotkey.repo";
import {
  BaseUserPreferencesRepo,
  LocalUserPreferencesRepo,
} from "./preferences.repo";
import { BaseStorageRepo, LocalStorageRepo } from "./storage.repo";
import { BaseTermRepo, CloudTermRepo, LocalTermRepo } from "./term.repo";
import { BaseToneRepo, LocalToneRepo } from "./tone.repo";
import {
  BaseTranscribeAudioRepo,
  CloudTranscribeAudioRepo,
  GroqTranscribeAudioRepo,
  LocalTranscribeAudioRepo,
  OpenAITranscribeAudioRepo,
} from "./transcribe-audio.repo";
import {
  BaseTranscriptionRepo,
  LocalTranscriptionRepo,
} from "./transcription.repo";
import { BaseUserRepo, CloudUserRepo, LocalUserRepo } from "./user.repo";
import { BaseOllamaRepo, OllamaRepo } from "./ollama.repo";

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

export const getAppTargetRepo = (): BaseAppTargetRepo => {
  return new LocalAppTargetRepo();
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

export const getToneRepo = (): BaseToneRepo => {
  return new LocalToneRepo();
};

export const getStorageRepo = (): BaseStorageRepo => {
  return new LocalStorageRepo();
};

export const getOllamaRepo = (): BaseOllamaRepo => {
  const config = getAppState().settings.aiPostProcessing;
  const url = config.ollamaUrl || OLLAMA_DEFAULT_URL;
  return new OllamaRepo(url);
};

export type GenerateTextRepoOutput = {
  repo: Nullable<BaseGenerateTextRepo>;
  apiKeyId: Nullable<string>;
  warnings: string[];
};

export const getGenerateTextRepo = (): GenerateTextRepoOutput => {
  const prefs = getGenerativePrefs(getAppState());
  if (prefs.mode === "cloud") {
    return {
      repo: new CloudGenerateTextRepo(),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "api") {
    const repo =
      prefs.provider === "openai"
        ? new OpenAIGenerateTextRepo(
            prefs.apiKeyValue,
            prefs.postProcessingModel,
          )
        : new GroqGenerateTextRepo(
            prefs.apiKeyValue,
            prefs.postProcessingModel,
          );
    return {
      repo,
      apiKeyId: prefs.apiKeyId,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "ollama") {
    const url = `${prefs.ollamaUrl || OLLAMA_DEFAULT_URL}/v1`;
    const model = prefs.ollamaModel || null;
    if (model) {
      const repo = new OllamaGenerateTextRepo(url, model);
      return {
        repo,
        apiKeyId: null,
        warnings: prefs.warnings,
      };
    } else {
      prefs.warnings.push(
        "No Ollama model configured for Ollama post-processing.",
      );
    }
  }

  return { repo: null, apiKeyId: null, warnings: prefs.warnings };
};

export type TranscribeAudioRepoOutput = {
  repo: BaseTranscribeAudioRepo;
  apiKeyId: Nullable<string>;
  warnings: string[];
};

export const getTranscribeAudioRepo = (): TranscribeAudioRepoOutput => {
  const prefs = getTranscriptionPrefs(getAppState());
  if (prefs.mode === "cloud") {
    return {
      repo: new CloudTranscribeAudioRepo(),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "api") {
    const repo =
      prefs.provider === "openai"
        ? new OpenAITranscribeAudioRepo(
            prefs.apiKeyValue,
            prefs.transcriptionModel,
          )
        : new GroqTranscribeAudioRepo(
            prefs.apiKeyValue,
            prefs.transcriptionModel,
          );
    return {
      repo,
      apiKeyId: prefs.apiKeyId,
      warnings: prefs.warnings,
    };
  }

  return {
    repo: new LocalTranscribeAudioRepo(),
    apiKeyId: null,
    warnings: prefs.warnings,
  };
};
