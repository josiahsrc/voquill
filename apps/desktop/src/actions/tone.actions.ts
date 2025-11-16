import { Tone, ToneCreateRequest } from "@repo/types";
import { getToneRepo, getUserPreferencesRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerTones } from "../utils/app.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";
import { getMyEffectiveUserId } from "../utils/user.utils";

let loadTonesPromise: Promise<void> | null = null;

const sortTones = (tones: Tone[]): Tone[] =>
  [...tones].sort((a, b) => a.sortOrder - b.sortOrder);

export const loadTones = async (): Promise<void> => {
  if (loadTonesPromise) {
    return loadTonesPromise;
  }

  loadTonesPromise = getToneRepo()
    .listTones()
    .then((tones) => {
      produceAppState((draft) => {
        registerTones(draft, tones);
      });
    })
    .catch((error) => {
      console.error("Failed to load tones", error);
      showErrorSnackbar("Failed to load tones. Please try again.");
    })
    .finally(() => {
      loadTonesPromise = null;
    });

  return loadTonesPromise;
};

export const createTone = async (
  request: ToneCreateRequest,
): Promise<Tone> => {
  try {
    const created = await getToneRepo().createTone(request);

    produceAppState((draft) => {
      registerTones(draft, [created]);
      draft.tones.selectedToneId = created.id;
      draft.tones.isCreating = false;
    });

    showSnackbar("Tone created successfully", { mode: "success" });
    return created;
  } catch (error) {
    console.error("Failed to create tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to create tone.",
    );
    throw error;
  }
};

export const updateTone = async (tone: Tone): Promise<Tone> => {
  try {
    const updated = await getToneRepo().updateTone(tone);

    produceAppState((draft) => {
      registerTones(draft, [updated]);
    });

    showSnackbar("Tone updated successfully", { mode: "success" });
    return updated;
  } catch (error) {
    console.error("Failed to update tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to update tone.",
    );
    throw error;
  }
};

export const deleteTone = async (id: string): Promise<void> => {
  try {
    await getToneRepo().deleteTone(id);

    produceAppState((draft) => {
      delete draft.toneById[id];

      // Clear selection if deleting the currently selected tone
      if (draft.tones.selectedToneId === id) {
        draft.tones.selectedToneId = null;
      }

      // Clear active tone if deleting the currently active tone
      const myUserId = getMyEffectiveUserId(draft);
      const prefs = draft.userPreferencesById[myUserId];
      if (prefs?.activeToneId === id) {
        draft.userPreferencesById[myUserId] = {
          ...prefs,
          activeToneId: null,
        };
      }
    });

    // Sync preferences if we cleared the active tone
    const myUserId = getMyEffectiveUserId(getAppState());
    const prefs = getAppState().userPreferencesById[myUserId];
    if (prefs && prefs.activeToneId === null) {
      await getUserPreferencesRepo().setUserPreferences(prefs);
    }

    showSnackbar("Tone deleted successfully", { mode: "success" });
  } catch (error) {
    console.error("Failed to delete tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to delete tone.",
    );
    throw error;
  }
};

export const setActiveTone = async (toneId: string | null): Promise<void> => {
  try {
    const myUserId = getMyEffectiveUserId(getAppState());
    const currentPrefs = getAppState().userPreferencesById[myUserId];

    if (!currentPrefs) {
      throw new Error("User preferences not found");
    }

    const updatedPrefs = {
      ...currentPrefs,
      activeToneId: toneId,
    };

    await getUserPreferencesRepo().setUserPreferences(updatedPrefs);

    produceAppState((draft) => {
      draft.userPreferencesById[myUserId] = updatedPrefs;
    });

    showSnackbar(toneId ? "Active tone set" : "Active tone cleared", { mode: "success" });
  } catch (error) {
    console.error("Failed to set active tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to set active tone.",
    );
    throw error;
  }
};

export const resetTonesToDefaults = async (): Promise<void> => {
  try {
    const toneRepo = getToneRepo();
    const state = getAppState();
    const myUserId = getMyEffectiveUserId(state);

    const tones = await toneRepo.resetToDefaults();
    const updatedPrefs = await getUserPreferencesRepo().getUserPreferences(myUserId);

    produceAppState((draft) => {
      draft.toneById = {};
      registerTones(draft, tones);
      draft.tones.selectedToneId = null;
      draft.tones.isCreating = false;

      if (updatedPrefs) {
        draft.userPreferencesById[myUserId] = updatedPrefs;
      } else {
        delete draft.userPreferencesById[myUserId];
      }
    });

    showSnackbar("Tones reset to defaults", { mode: "success" });
  } catch (error) {
    console.error("Failed to reset tones", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to reset tones.",
    );
    throw error;
  }
};

export const getSortedTones = (): Tone[] => {
  const tones = Object.values(getAppState().toneById);
  return sortTones(tones);
};

export const getActiveTone = (): Tone | null => {
  const state = getAppState();
  const myUserId = getMyEffectiveUserId(state);
  const prefs = state.userPreferencesById[myUserId];
  const activeToneId = prefs?.activeToneId;

  if (!activeToneId) {
    return null;
  }

  return state.toneById[activeToneId] ?? null;
};
