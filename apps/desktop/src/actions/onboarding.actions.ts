import { firemix } from "@firemix/client";
import { MemberPlan, User } from "@repo/types";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
import { getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  DEFAULT_POST_PROCESSING_MODE,
  DEFAULT_PROCESSING_MODE,
} from "../types/ai.types";
import {
  getMyUserId,
  getPostProcessingPreferenceFromState,
  getTranscriptionPreferenceFromState,
  setCurrentUser,
} from "../utils/user.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";
import { tryOpenPaymentDialogForPlan } from "./payment.actions";
import {
  OnboardingPageKey,
  OnboardingState,
} from "../state/onboarding.state";

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
    draft.onboarding.plan = plan;

    const targetPageKey: OnboardingPageKey =
      plan === "pro" ? "login" : "transcription";

    navigateToOnboardingPage(draft.onboarding, targetPageKey);
  });
};

export const loginWithGoogleForOnboarding = async (): Promise<void> => {
  const { onboarding } = getAppState();
  if (onboarding.loggingIn) {
    return;
  }

  produceAppState((draft) => {
    draft.onboarding.loggingIn = true;
  });

  try {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    await signInWithPopup(auth, provider);

    tryOpenPaymentDialogForPlan("pro");
    produceAppState((draft) => {
      draft.onboarding.loggingIn = false;
    });
    goToOnboardingPage("transcription");
  } catch (error) {
    produceAppState((draft) => {
      draft.onboarding.loggingIn = false;
    });

    if (error instanceof FirebaseError && error.code === "auth/popup-closed-by-user") {
      return;
    }

    showErrorSnackbar("Failed to sign in. Please try again.");
    console.error("Failed to sign in during onboarding", error);
  }
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
    const userId = getMyUserId(state);

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
