import {
  ApiKeyProvider,
  DictationPillVisibility,
  Nullable,
  User,
  UserPreferences,
} from "@repo/types";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { detectLocale, matchSupportedLocale } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import type { AppState } from "../state/app.state";
import { applyAiPreferences } from "./ai.utils";
import { registerUsers } from "./app.utils";
import {
  getAllowsChangeAgentMode,
  getAllowsChangePostProcessing,
  getAllowsChangeTranscription,
  getIsEnterpriseEnabled,
} from "./enterprise.utils";
import { KEYBOARD_LAYOUT_LANGUAGE } from "./language.utils";
import { getEffectivePlan, getMemberExceedsLimitByState } from "./member.utils";

export const LOCAL_USER_ID = "local-user-id";

export const getIsLoggedIn = (state: AppState): boolean => {
  return !!state.auth;
};

export const getHasEmailProvider = (state: AppState): boolean => {
  const auth = state.auth;
  const providers = auth?.providers ?? [];
  return providers.includes("password");
};

export const getIsOnboarded = (state: AppState): boolean => {
  return Boolean(getMyUser(state)?.onboarded);
};

export const getIsDictationUnlocked = (state: AppState): boolean => {
  return getIsOnboarded(state) || state.onboarding.dictationOverrideEnabled;
};

export const getHasCloudAccess = (state: AppState): boolean => {
  const effectivePlan = getEffectivePlan(state);
  return effectivePlan !== "community";
};

export const getMyCloudUserId = (state: AppState): Nullable<string> =>
  state.auth?.uid ?? null;

export const getMyEffectiveUserId = (state: AppState): string => {
  return state.auth?.uid ?? LOCAL_USER_ID;
};

export const getMyUser = (state: AppState): Nullable<User> => {
  return getRec(state.userById, getMyEffectiveUserId(state)) ?? null;
};

export const getMyPreferredLocale = (state: AppState): Locale => {
  const user = getMyUser(state);
  return (
    matchSupportedLocale(user?.preferredLanguage) ??
    detectLocale() ??
    DEFAULT_LOCALE
  );
};

export const getDetectedSystemLocale = (): string => {
  return detectLocale() ?? DEFAULT_LOCALE;
};

export const getMyPrimaryDictationLanguage = (state: AppState): string => {
  const user = getMyUser(state);
  if (user?.preferredLanguage) {
    return user.preferredLanguage;
  }
  return getDetectedSystemLocale();
};

export const getMyDictationLanguage = (state: AppState): string => {
  // TODO: We should pass the dictation language into the processors instead of overriding
  const override = state.dictationLanguageOverride;
  if (override) {
    return override;
  }

  return getMyPrimaryDictationLanguage(state);
};

export const loadMyEffectiveDictationLanguage = async (
  state: AppState,
): Promise<string> => {
  let lang = getMyDictationLanguage(state);
  if (lang === KEYBOARD_LAYOUT_LANGUAGE) {
    lang = await invoke<string>("get_keyboard_language").catch((e) => {
      console.error("Failed to get keyboard language:", e);
      return "en";
    });
  }

  return lang;
};

export const formatDictationLanguageCode = (language: string): string => {
  const baseCode = language.split("-")[0];
  return baseCode.toUpperCase().slice(0, 2);
};

export const getMyUserPreferences = (
  state: AppState,
): Nullable<UserPreferences> => {
  return state.userPrefs;
};

export const getMyPreferredMicrophone = (state: AppState): Nullable<string> => {
  return state.userPrefs?.preferredMicrophone ?? null;
};

export const getShouldGoToOnboarding = (state: AppState): boolean => {
  const prefs = getMyUserPreferences(state);
  const gotStartedAt = prefs?.gotStartedAt;
  if (!gotStartedAt) {
    return false;
  }

  const now = Date.now();
  const elapsed = now - gotStartedAt;
  const twoMinutes = 2 * 60 * 1000;
  if (elapsed < twoMinutes) {
    return true;
  }

  return false;
};

export const getMyUserName = (state: AppState): string => {
  const user = getMyUser(state);
  return user?.name || "Guest";
};

export const getIsSignedIn = (state: AppState): boolean => {
  return !!state.auth;
};

export const setCurrentUser = (draft: AppState, user: User): void => {
  registerUsers(draft, [user]);
};

export const setUserPreferences = (
  draft: AppState,
  value: UserPreferences,
): void => {
  draft.userPrefs = value;
  applyAiPreferences(draft, value);
};

type BaseTranscriptionPrefs = {
  warnings: string[];
};

export type CloudTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "cloud";
};

export type LocalTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "local";
  gpuEnumerationEnabled: boolean;
  transcriptionDevice: string | null;
  transcriptionModelSize: string | null;
};

export type ApiTranscriptionPrefs = BaseTranscriptionPrefs & {
  mode: "api";
  provider: ApiKeyProvider;
  apiKeyId: string;
  apiKeyValue: string;
  transcriptionModel: string | null;
};

export type TranscriptionPrefs =
  | CloudTranscriptionPrefs
  | LocalTranscriptionPrefs
  | ApiTranscriptionPrefs;

export const getTranscriptionPrefs = (state: AppState): TranscriptionPrefs => {
  const config = state.settings.aiTranscription;
  const apiKey = getRec(state.apiKeyById, config.selectedApiKeyId)?.keyFull;
  const cloudAvailable = getHasCloudAccess(state);
  const exceedsLimits = getMemberExceedsLimitByState(state);
  const warnings: string[] = [];
  const allowChange = getAllowsChangeTranscription(state);

  if (config.mode === "cloud" || !allowChange) {
    if (cloudAvailable) {
      if (exceedsLimits) {
        warnings.push("Cloud transcription limit exceeded.");
      } else {
        return { mode: "cloud", warnings };
      }
    } else {
      warnings.push(
        "Cloud transcription is not available. Please check your subscription.",
      );
    }
  }

  if (config.mode === "api") {
    const selectedApiKey = getRec(state.apiKeyById, config.selectedApiKeyId);
    const provider = selectedApiKey?.provider;
    const noKeyRequired =
      provider === "speaches" ||
      provider === "ollama" ||
      provider === "openai-compatible";
    if (apiKey || noKeyRequired) {
      return {
        mode: "api",
        provider: provider ?? "groq",
        apiKeyId: config.selectedApiKeyId!,
        apiKeyValue: apiKey ?? "",
        transcriptionModel: selectedApiKey?.transcriptionModel ?? null,
        warnings,
      };
    } else {
      warnings.push("No API key configured for API transcription.");
    }
  }

  return {
    mode: "local",
    warnings,
    gpuEnumerationEnabled: config.gpuEnumerationEnabled,
    transcriptionDevice: config.device ?? null,
    transcriptionModelSize: config.modelSize ?? null,
  };
};

type BaseGenerativePrefs = {
  warnings: string[];
};

export type CloudGenerativePrefs = BaseGenerativePrefs & {
  mode: "cloud";
};

export type ApiGenerativePrefs = BaseGenerativePrefs & {
  mode: "api";
  provider: ApiKeyProvider;
  apiKeyId: string;
  apiKeyValue: string;
  postProcessingModel: string | null;
};

export type NoneGenerativePrefs = BaseGenerativePrefs & {
  mode: "none";
};

export type GenerativePrefs =
  | CloudGenerativePrefs
  | ApiGenerativePrefs
  | NoneGenerativePrefs;

type GenerativeConfigInput = {
  mode: "none" | "api" | "cloud";
  selectedApiKeyId: string | null;
};

const getGenPrefsInternal = ({
  state,
  config,
  context,
  allowChange,
}: {
  state: AppState;
  config: GenerativeConfigInput;
  context: string;
  allowChange: boolean;
}): GenerativePrefs => {
  const apiKey = getRec(state.apiKeyById, config.selectedApiKeyId)?.keyFull;
  const exceedsLimits = getMemberExceedsLimitByState(state);
  const cloudAvailable = getHasCloudAccess(state);
  const warnings: string[] = [];

  if (config.mode === "cloud" || !allowChange) {
    if (cloudAvailable) {
      if (exceedsLimits) {
        warnings.push(`Cloud ${context} limit exceeded.`);
      } else {
        return { mode: "cloud", warnings };
      }
    } else {
      warnings.push(
        `Cloud ${context} is not available. Please check your subscription.`,
      );
    }
  }

  if (config.mode === "api") {
    const selectedApiKey = getRec(state.apiKeyById, config.selectedApiKeyId);
    const provider = selectedApiKey?.provider;
    const noKeyRequired =
      provider === "ollama" || provider === "openai-compatible";
    if (apiKey || noKeyRequired) {
      return {
        mode: "api",
        provider: provider ?? "groq",
        apiKeyId: config.selectedApiKeyId!,
        apiKeyValue: apiKey ?? "",
        postProcessingModel: selectedApiKey?.postProcessingModel ?? null,
        warnings,
      };
    } else {
      warnings.push(`No API key configured for API ${context}.`);
    }
  }

  return { mode: "none", warnings };
};

export const getGenerativePrefs = (state: AppState): GenerativePrefs => {
  return getGenPrefsInternal({
    state,
    config: state.settings.aiPostProcessing,
    context: "post-processing",
    allowChange: getAllowsChangePostProcessing(state),
  });
};

export type OpenClawGenerativePrefs = {
  mode: "openclaw";
  gatewayUrl: string;
  token: string;
  warnings: string[];
};

export type AgentModePrefs = GenerativePrefs | OpenClawGenerativePrefs;

export const getAgentModePrefs = (state: AppState): AgentModePrefs => {
  const agentMode = state.settings.agentMode;

  if (agentMode.mode === "openclaw" && !getIsEnterpriseEnabled()) {
    const warnings: string[] = [];
    if (!agentMode.openclawGatewayUrl) {
      warnings.push("OpenClaw gateway URL is not configured.");
    }
    if (!agentMode.openclawToken) {
      warnings.push("OpenClaw token is not configured.");
    }
    return {
      mode: "openclaw",
      gatewayUrl: agentMode.openclawGatewayUrl ?? "",
      token: agentMode.openclawToken ?? "",
      warnings,
    };
  }

  return getGenPrefsInternal({
    state,
    config: agentMode as GenerativeConfigInput,
    context: "agent mode",
    allowChange: getAllowsChangeAgentMode(state),
  });
};

export const getEffectivePillVisibility = (
  visibility?: Nullable<string>,
): DictationPillVisibility => {
  if (
    visibility === "hidden" ||
    visibility === "while_active" ||
    visibility === "persistent"
  ) {
    return visibility;
  }

  return "while_active";
};
