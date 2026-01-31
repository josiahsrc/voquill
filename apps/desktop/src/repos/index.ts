import type { CloudModel } from "@repo/functions";
import { Nullable } from "@repo/types";
import { getRec } from "@repo/utilities";
import { getAppState } from "../store";
import { getIsEnterpriseEnabled } from "../utils/enterprise.utils";
import { OLLAMA_DEFAULT_URL } from "../utils/ollama.utils";
import {
  GenerativePrefs,
  getAgentModePrefs,
  getGenerativePrefs,
  getHasCloudAccess,
  getTranscriptionPrefs,
} from "../utils/user.utils";
import { BaseApiKeyRepo, LocalApiKeyRepo } from "./api-key.repo";
import { BaseAppTargetRepo, LocalAppTargetRepo } from "./app-target.repo";
import { BaseAuthRepo, CloudAuthRepo, EnterpriseAuthRepo } from "./auth.repo";
import {
  BaseConfigRepo,
  CloudConfigRepo,
  EnterpriseConfigRepo,
} from "./config.repo";
import { EnterpriseRepo } from "./enterprise.repo";
import {
  AzureOpenAIGenerateTextRepo,
  BaseGenerateTextRepo,
  ClaudeGenerateTextRepo,
  CloudGenerateTextRepo,
  DeepseekGenerateTextRepo,
  EnterpriseGenerateTextRepo,
  GeminiGenerateTextRepo,
  GroqGenerateTextRepo,
  OllamaGenerateTextRepo,
  OpenAIGenerateTextRepo,
  OpenRouterGenerateTextRepo,
} from "./generate-text.repo";
import { BaseHotkeyRepo, LocalHotkeyRepo } from "./hotkey.repo";
import {
  BaseMemberRepo,
  CloudMemberRepo,
  EnterpriseMemberRepo,
} from "./member.repo";
import {
  BaseUserPreferencesRepo,
  LocalUserPreferencesRepo,
} from "./preferences.repo";
import { BaseStorageRepo, LocalStorageRepo } from "./storage.repo";
import { BaseStripeRepo, CloudStripeRepo } from "./stripe.repo";
import {
  BaseTermRepo,
  CloudTermRepo,
  EnterpriseTermRepo,
  LocalTermRepo,
} from "./term.repo";
import { BaseToneRepo, LocalToneRepo } from "./tone.repo";
import {
  AldeaTranscribeAudioRepo,
  AzureTranscribeAudioRepo,
  BaseTranscribeAudioRepo,
  CloudTranscribeAudioRepo,
  EnterpriseTranscribeAudioRepo,
  GeminiTranscribeAudioRepo,
  GroqTranscribeAudioRepo,
  LocalTranscribeAudioRepo,
  OpenAITranscribeAudioRepo,
  SpeachesTranscribeAudioRepo,
} from "./transcribe-audio.repo";
import {
  BaseTranscriptionRepo,
  LocalTranscriptionRepo,
} from "./transcription.repo";
import {
  BaseUserRepo,
  CloudUserRepo,
  EnterpriseUserRepo,
  LocalUserRepo,
} from "./user.repo";

const isEnterprise = () => getIsEnterpriseEnabled();
const shouldUseCloud = () => getHasCloudAccess(getAppState());

export const getMemberRepo = (): BaseMemberRepo => {
  return isEnterprise() ? new EnterpriseMemberRepo() : new CloudMemberRepo();
};

export const getStripeRepo = (): Nullable<BaseStripeRepo> => {
  return isEnterprise() ? null : new CloudStripeRepo();
};

export const getConfigRepo = (): BaseConfigRepo => {
  return isEnterprise() ? new EnterpriseConfigRepo() : new CloudConfigRepo();
};

export const getEnterpriseRepo = (): Nullable<EnterpriseRepo> => {
  return isEnterprise() ? new EnterpriseRepo() : null;
};

export const getAuthRepo = (): BaseAuthRepo => {
  return isEnterprise() ? new EnterpriseAuthRepo() : new CloudAuthRepo();
};

export const getUserRepo = (): BaseUserRepo => {
  if (isEnterprise()) {
    return new EnterpriseUserRepo();
  }

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
  if (isEnterprise()) {
    return new EnterpriseTermRepo();
  }
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

export type GenerateTextRepoOutput = {
  repo: Nullable<BaseGenerateTextRepo>;
  apiKeyId: Nullable<string>;
  warnings: string[];
};

const getGenTextRepoInternal = ({
  prefs,
  cloudModel,
}: {
  prefs: GenerativePrefs;
  cloudModel: CloudModel;
}): GenerateTextRepoOutput => {
  const state = getAppState();

  if (prefs.mode === "enterprise") {
    return {
      repo: new EnterpriseGenerateTextRepo(cloudModel),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "cloud") {
    return {
      repo: new CloudGenerateTextRepo(cloudModel),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "api") {
    let repo: BaseGenerateTextRepo | null = null;

    if (prefs.provider === "ollama") {
      // Get Ollama-specific config from the API key
      const apiKeyRecord = getRec(state.apiKeyById, prefs.apiKeyId);
      const baseUrl = apiKeyRecord?.baseUrl || OLLAMA_DEFAULT_URL;
      const model = prefs.postProcessingModel;
      const ollamaApiKey = apiKeyRecord?.keyFull || undefined;
      if (model) {
        repo = new OllamaGenerateTextRepo(`${baseUrl}/v1`, model, ollamaApiKey);
      } else {
        prefs.warnings.push("No model configured for Ollama post-processing.");
      }
    } else if (prefs.provider === "openrouter") {
      // Get OpenRouter-specific config from the API key
      const apiKey = getRec(state.apiKeyById, prefs.apiKeyId);
      const config = apiKey?.openRouterConfig;
      const providerRouting = config?.providerRouting ?? undefined;
      repo = new OpenRouterGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
        providerRouting,
      );
    } else if (prefs.provider === "openai") {
      repo = new OpenAIGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
      );
    } else if (prefs.provider === "azure") {
      const apiKeyRecord = getRec(state.apiKeyById, prefs.apiKeyId);
      const endpoint = apiKeyRecord?.baseUrl || "";
      const deploymentName = prefs.postProcessingModel || "gpt-4o-mini";
      if (!endpoint) {
        prefs.warnings.push("No endpoint configured for Azure OpenAI.");
      }
      repo = new AzureOpenAIGenerateTextRepo(
        prefs.apiKeyValue,
        endpoint,
        deploymentName,
      );
    } else if (prefs.provider === "deepseek") {
      repo = new DeepseekGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
      );
    } else if (prefs.provider === "gemini") {
      repo = new GeminiGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
      );
    } else if (prefs.provider === "claude") {
      repo = new ClaudeGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
      );
    } else {
      repo = new GroqGenerateTextRepo(
        prefs.apiKeyValue,
        prefs.postProcessingModel,
      );
    }

    return {
      repo,
      apiKeyId: prefs.apiKeyId,
      warnings: prefs.warnings,
    };
  }

  return { repo: null, apiKeyId: null, warnings: prefs.warnings };
};

export const getGenerateTextRepo = (): GenerateTextRepoOutput => {
  const state = getAppState();
  const prefs = getGenerativePrefs(state);
  return getGenTextRepoInternal({ prefs, cloudModel: "medium" });
};

export const getAgentRepo = (): GenerateTextRepoOutput => {
  const state = getAppState();
  const prefs = getAgentModePrefs(state);
  return getGenTextRepoInternal({ prefs, cloudModel: "large" });
};

export type TranscribeAudioRepoOutput = {
  repo: BaseTranscribeAudioRepo;
  apiKeyId: Nullable<string>;
  warnings: string[];
};

export const getTranscribeAudioRepo = (): TranscribeAudioRepoOutput => {
  const prefs = getTranscriptionPrefs(getAppState());

  if (prefs.mode === "enterprise") {
    return {
      repo: new EnterpriseTranscribeAudioRepo(),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "cloud") {
    return {
      repo: new CloudTranscribeAudioRepo(),
      apiKeyId: null,
      warnings: prefs.warnings,
    };
  } else if (prefs.mode === "api") {
    let repo: BaseTranscribeAudioRepo;

    if (prefs.provider === "openai") {
      repo = new OpenAITranscribeAudioRepo(
        prefs.apiKeyValue,
        prefs.transcriptionModel,
      );
    } else if (prefs.provider === "aldea") {
      repo = new AldeaTranscribeAudioRepo(prefs.apiKeyValue);
    } else if (prefs.provider === "azure") {
      const state = getAppState();
      const apiKeyRecord = getRec(state.apiKeyById, prefs.apiKeyId);
      const region = apiKeyRecord?.azureRegion || "eastus";
      repo = new AzureTranscribeAudioRepo(prefs.apiKeyValue, region);
    } else if (prefs.provider === "gemini") {
      repo = new GeminiTranscribeAudioRepo(
        prefs.apiKeyValue,
        prefs.transcriptionModel,
      );
    } else if (prefs.provider === "speaches") {
      const state = getAppState();
      const apiKeyRecord = getRec(state.apiKeyById, prefs.apiKeyId);
      const baseUrl = apiKeyRecord?.baseUrl || "http://localhost:8000";
      const model =
        prefs.transcriptionModel || "Systran/faster-whisper-large-v3";
      if (!model) {
        prefs.warnings.push("No model configured for Speaches transcription.");
      }
      repo = new SpeachesTranscribeAudioRepo(
        baseUrl,
        model || "Systran/faster-whisper-large-v3",
      );
    } else {
      repo = new GroqTranscribeAudioRepo(
        prefs.apiKeyValue,
        prefs.transcriptionModel,
      );
    }

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
