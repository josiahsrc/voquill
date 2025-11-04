import { firemix } from "@firemix/client";
import { MemberPlan, User } from "@repo/types";
import { getUserRepo } from "../repos";
import {
  OnboardingPageKey,
  OnboardingState,
} from "../state/onboarding.state";
import { getAppState, produceAppState } from "../store";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
} from "../types/ai.types";
import {
  getMyEffectiveUserId,
  getPostProcessingPreferenceFromState,
  getTranscriptionPreferenceFromState,
  setCurrentUser
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

export const selectOnboardingPlan = (plan: MemberPlan) => {
  produceAppState((draft) => {
    draft.onboarding.selectedPlan = plan;

    const targetPageKey: OnboardingPageKey =
      plan === "pro" ? "login" : "transcription";

    navigateToOnboardingPage(draft.onboarding, targetPageKey);
  });
};

export const submitOnboarding = async () => {
  const state = getAppState();
  const trimmedName = state.onboarding.name.trim();

  const transcriptionPreference =
    getTranscriptionPreferenceFromState(state) ?? {
      mode: DEFAULT_PROCESSING_MODE,
      apiKeyId: null,
    };

  const postProcessingPreference =
    getPostProcessingPreferenceFromState(state) ?? {
      mode: DEFAULT_POST_PROCESSING_MODE,
      apiKeyId: null,
    };

  produceAppState((draft) => {
    draft.onboarding.submitting = true;
    draft.onboarding.name = trimmedName;
  });

  try {
    const repo = getUserRepo();
    const now = firemix().now();
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
      wordsThisMonth: 0,
      wordsThisMonthMonth: null,
      wordsTotal: 0,
      playInteractionChime: true,
      preferredTranscriptionMode: transcriptionPreference.mode,
      preferredTranscriptionApiKeyId: transcriptionPreference.apiKeyId,
      preferredPostProcessingMode: postProcessingPreference.mode,
      preferredPostProcessingApiKeyId: postProcessingPreference.apiKeyId,
    };

    const savedUser = await repo.setUser(user);

    produceAppState((draft) => {
      setCurrentUser(draft, savedUser);
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
