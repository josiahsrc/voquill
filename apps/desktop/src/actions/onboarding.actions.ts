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
import { CURRENT_COHORT } from "../utils/analytics.utils";
import { getIsEnterpriseEnabled } from "../utils/enterprise.utils";
import { CURRENT_FEATURE } from "../utils/feature.utils";
import {
  CHAT_TONE_ID,
  CLEAN_TONE_ID,
  EMAIL_TONE_ID,
} from "../utils/tone.utils";
import {
  GenerativePrefs,
  getAgentModePrefs,
  getGenerativePrefs,
  getMyEffectiveUserId,
  getMyUser,
  getTranscriptionPrefs,
  setCurrentUser,
  setUserPreferences,
  TranscriptionPrefs,
} from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import { refreshMember } from "./member.actions";
import { setAutoLaunchEnabled } from "./settings.actions";

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

export const setOnboardingIsMac = (isMac: boolean) => {
  produceAppState((draft) => {
    draft.onboarding.isMac = isMac;
  });
};

export const setDidSignUpWithAccount = (didSignUp: boolean) => {
  produceAppState((draft) => {
    draft.onboarding.didSignUpWithAccount = didSignUp;
  });
};

export const setAwaitingSignInNavigation = (awaiting: boolean) => {
  produceAppState((draft) => {
    draft.onboarding.awaitingSignInNavigation = awaiting;
  });
};

export const setOnboardingPreferredMicrophone = (microphone: string | null) => {
  produceAppState((draft) => {
    draft.onboarding.preferredMicrophone = microphone;
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
      title: state.onboarding.title.trim() || null,
      company: state.onboarding.company.trim() || null,
      bio: null,
      onboarded: false,
      onboardedAt: null,
      timezone: null,
      preferredMicrophone: null,
      preferredLanguage: DEFAULT_LOCALE,
      wordsThisMonth: 0,
      wordsThisMonthMonth: null,
      wordsTotal: 0,
      playInteractionChime: true,
      hasFinishedTutorial: false,
      hasMigratedPreferredMicrophone: true,
      cohort: CURRENT_COHORT,
      stylingMode: "manual",
      activeToneIds: [CLEAN_TONE_ID, EMAIL_TONE_ID, CHAT_TONE_ID],
      selectedToneId: CHAT_TONE_ID,
    };

    const preferences: UserPreferences = {
      gpuEnumerationEnabled:
        transcriptionPreference.mode === "local"
          ? transcriptionPreference.gpuEnumerationEnabled
          : false,
      userId,
      transcriptionMode: transcriptionPreference.mode,
      transcriptionApiKeyId:
        transcriptionPreference.mode === "api"
          ? transcriptionPreference.apiKeyId
          : null,
      transcriptionDevice:
        transcriptionPreference.mode === "local"
          ? transcriptionPreference.transcriptionDevice
          : null,
      transcriptionModelSize:
        transcriptionPreference.mode === "local"
          ? transcriptionPreference.transcriptionModelSize
          : null,
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
      isEnterprise: getIsEnterpriseEnabled(),
      preferredMicrophone: normalizedMicrophone,
      ignoreUpdateDialog: false,
      incognitoModeEnabled: false,
      incognitoModeIncludeInStats: false,
      dictationPillVisibility: "persistent",
      useNewBackend: true,
    };

    const [savedUser, savedPreferences] = await Promise.all([
      repo.setMyUser(user),
      preferencesRepo.setUserPreferences(preferences),
    ]);

    produceAppState((draft) => {
      setCurrentUser(draft, savedUser);
      setUserPreferences(draft, savedPreferences);
      draft.onboarding.submitting = false;
      draft.onboarding.name = savedUser.name;
    });

    await refreshMember();
    return savedUser;
  } catch (err) {
    produceAppState((draft) => {
      draft.onboarding.submitting = false;
    });
    showErrorSnackbar(err);
  }
};

export const finishOnboarding = async () => {
  const state = getAppState();
  const existingUser = getMyUser(state);
  if (!existingUser) {
    throw new Error("Cannot finish onboarding: user not found");
  }

  try {
    const repo = getUserRepo();
    const now = new Date().toISOString();

    const updatedUser: User = {
      ...existingUser,
      updatedAt: now,
      onboarded: true,
      onboardedAt: now,
      hasFinishedTutorial: true,
    };

    const savedUser = await repo.setMyUser(updatedUser);
    produceAppState((draft) => {
      setCurrentUser(draft, savedUser);
    });

    await setAutoLaunchEnabled(true);

    return savedUser;
  } catch (err) {
    showErrorSnackbar(err);
    throw err;
  }
};
