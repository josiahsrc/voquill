import { User, UserPreferences } from "@repo/types";
import { DEFAULT_LOCALE } from "../i18n/config";
import { getUserPreferencesRepo, getUserRepo } from "../repos";
import {
  INITIAL_ONBOARDING_STATE,
  OnboardingPageKey,
  OnboardingState,
} from "../state/onboarding.state";
import { getAppState, produceAppState } from "../store";
import { DEFAULT_TRANSCRIPTION_MODE } from "../types/ai.types";
import { CURRENT_FEATURE } from "../utils/feature.utils";
import { PricingPlan } from "../utils/price.utils";
import {
  GenerativePrefs,
  getAgentModePrefs,
  getGenerativePrefs,
  getMyEffectiveUserId,
  getTranscriptionPrefs,
  setCurrentUser,
  setUserPreferences,
  TranscriptionPrefs,
} from "../utils/user.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";

const navigateToOnboardingPage = (
  onboarding: OnboardingState,
  nextPage: OnboardingPageKey,
) => {
  if (onboarding.currentPage === nextPage) {
    return;
  }

  onboarding.history.push(onboarding.currentPage);
  onboarding.currentPage = nextPage;
};

export const goBackOnboardingPage = () => {
  produceAppState((draft) => {
    const previousPage = draft.onboarding.history.pop();
    if (previousPage) {
      draft.onboarding.currentPage = previousPage;
    }
  });
};

export const goToOnboardingPage = (nextPage: OnboardingPageKey) => {
  produceAppState((draft) => {
    navigateToOnboardingPage(draft.onboarding, nextPage);
  });
};

export const resetOnboarding = () => {
  produceAppState((draft) => {
    Object.assign(draft.onboarding, INITIAL_ONBOARDING_STATE);
  });
};

export const selectOnboardingPlan = (plan: PricingPlan) => {
  produceAppState((draft) => {
    draft.onboarding.selectedPlan = plan;
    draft.onboarding.isEnterprise = plan === "enterprise";
    if (plan === "enterprise") {
      navigateToOnboardingPage(draft.onboarding, "transcription");
      return;
    }

    const targetPageKey: OnboardingPageKey =
      plan === "community" ? "transcription" : "login";

    navigateToOnboardingPage(draft.onboarding, targetPageKey);
  });
};

export const submitOnboarding = async () => {
  const state = getAppState();
  const trimmedName = state.onboarding.name.trim();
  const preferredMicrophone =
    state.onboarding.preferredMicrophone?.trim() ?? null;
  const normalizedMicrophone =
    preferredMicrophone && preferredMicrophone.length > 0
      ? preferredMicrophone
      : null;

  const transcriptionPreference: TranscriptionPrefs = getTranscriptionPrefs(
    state,
  ) ?? {
    mode: DEFAULT_TRANSCRIPTION_MODE,
    apiKeyId: null,
  };

  const postProcessingPreference: GenerativePrefs = getGenerativePrefs(state);
  const agentModePreference: GenerativePrefs = getAgentModePrefs(state);

  produceAppState((draft) => {
    draft.onboarding.submitting = true;
    draft.onboarding.name = trimmedName;
  });

  try {
    const repo = getUserRepo();
    const preferencesRepo = getUserPreferencesRepo();
    const now = new Date().toISOString();
    const userId = getMyEffectiveUserId(state);

    const user: User = {
      id: userId,
      createdAt: now,
      updatedAt: now,
      name: trimmedName,
      bio: null,
      onboarded: true,
      onboardedAt: now,
      timezone: null,
      preferredMicrophone: null,
      preferredLanguage: DEFAULT_LOCALE,
      wordsThisMonth: 0,
      wordsThisMonthMonth: null,
      wordsTotal: 0,
      playInteractionChime: true,
      hasFinishedTutorial: false,
      hasMigratedPreferredMicrophone: true,
    };

    const preferences: UserPreferences = {
      gpuEnumerationEnabled: false,
      userId,
      transcriptionMode: transcriptionPreference.mode,
      transcriptionApiKeyId:
        transcriptionPreference.mode === "api"
          ? transcriptionPreference.apiKeyId
          : null,
      transcriptionDevice: null,
      transcriptionModelSize: null,
      postProcessingMode: postProcessingPreference.mode,
      postProcessingApiKeyId:
        postProcessingPreference.mode === "api"
          ? postProcessingPreference.apiKeyId
          : null,
      postProcessingOllamaUrl: null,
      postProcessingOllamaModel: null,
      activeToneId: null,
      gotStartedAt: null,
      agentMode: agentModePreference.mode,
      agentModeApiKeyId:
        agentModePreference.mode === "api"
          ? agentModePreference.apiKeyId
          : null,
      lastSeenFeature: CURRENT_FEATURE,
      isEnterprise: state.onboarding.isEnterprise,
      languageSwitchEnabled: false,
      secondaryDictationLanguage: null,
      activeDictationLanguage: "primary",
      preferredMicrophone: normalizedMicrophone,
    };

    const [savedUser, savedPreferences] = await Promise.all([
      repo.setUser(user),
      preferencesRepo.setUserPreferences(preferences),
    ]);

    produceAppState((draft) => {
      setCurrentUser(draft, savedUser);
      setUserPreferences(draft, savedPreferences);
      draft.onboarding.submitting = false;
      draft.onboarding.name = savedUser.name;
    });

    showSnackbar("You're all set! Onboarding complete.", { mode: "success" });
    return savedUser;
  } catch (err) {
    produceAppState((draft) => {
      draft.onboarding.submitting = false;
    });
    showErrorSnackbar(err);
  }
};
