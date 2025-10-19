import { firemix } from "@firemix/client";
import { User } from "@repo/types";
import { getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerUsers } from "../utils/app.utils";
import { getMyUserId } from "../utils/user.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";

export const advancePage = (delta = 1) => {
  produceAppState((draft) => {
    draft.onboarding.page += delta;
  });
};

export const submitOnboarding = async () => {
  const state = getAppState();
  const trimmedName = state.onboarding.name.trim();

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
  };

    const savedUser = await repo.setUser(user);

    produceAppState((draft) => {
      registerUsers(draft, [savedUser]);
      draft.currentUserId = savedUser.id;
      draft.onboarding.submitting = false;
      draft.onboarding.name = savedUser.name;
    });

    showSnackbar("You're all set! Onboarding complete.");
    return savedUser;
  } catch (err) {
    produceAppState((draft) => {
      draft.onboarding.submitting = false;
    });
    showErrorSnackbar(err);
  }
};
