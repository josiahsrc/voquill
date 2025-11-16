import { Tone, UserPreferences } from "@repo/types";
import { getToneRepo, getUserPreferencesRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerTones } from "../utils/app.utils";
import { getDefaultSystemTones } from "../utils/tone.utils";
import { getMyEffectiveUserId, registerUserPreferences } from "../utils/user.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";
import { createDefaultPreferences } from "./user.actions";
import { ToneEditorMode } from "../state/tone-editor.state";

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

export const upsertTone = async (tone: Tone): Promise<Tone> => {
  try {
    const saved = await getToneRepo().upsertTone(tone);

    produceAppState((draft) => {
      registerTones(draft, [saved]);
      draft.tones.selectedToneId = saved.id;
      draft.tones.isCreating = false;
    });

    showSnackbar("Tone saved successfully", { mode: "success" });
    return saved;
  } catch (error) {
    console.error("Failed to save tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to save tone.",
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

    showSnackbar(toneId ? "Default tone set" : "Default tone cleared", { mode: "success" });
  } catch (error) {
    console.error("Failed to set active tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to set active tone.",
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

const markInitialTonesCreated = async (value: boolean): Promise<void> => {
  const state = getAppState();
  const myUserId = getMyEffectiveUserId(state);
  const currentPrefs = state.userPreferencesById[myUserId];
  const basePreferences = currentPrefs ?? createDefaultPreferences(myUserId);

  const updatedPrefs: UserPreferences = {
    ...basePreferences,
    hasCreatedInitialTones: value,
  };

  const saved = await getUserPreferencesRepo().setUserPreferences(updatedPrefs);
  produceAppState((draft) => {
    registerUserPreferences(draft, [saved]);
  });
};

export const recreateInitialTones = async (): Promise<void> => {
  await loadTones();

  const tones = Object.values(getAppState().toneById);
  for (const tone of tones) {
    if (tone.isSystem) {
      await deleteTone(tone.id);
    }
  }

  const sysTones = getDefaultSystemTones();
  for (const tone of sysTones) {
    await getToneRepo().upsertTone({
      ...tone,
      isSystem: true,
    });
  }
};

export const initializeInitialTones = async (): Promise<void> => {
  try {
    await recreateInitialTones();
    await markInitialTonesCreated(true);
  } catch (error) {
    console.error("Failed to initialize default tones", error);
    showErrorSnackbar("Failed to initialize default tones. Please try again.");
    throw error;
  }
};

export const openToneEditorDialog = (options: {
  mode: ToneEditorMode;
  toneId?: string | null;
  targetId?: string | null;
}): void => {
  produceAppState((draft) => {
    draft.toneEditor.open = true;
    draft.toneEditor.mode = options.mode;
    draft.toneEditor.toneId = options.toneId ?? null;
    draft.toneEditor.targetId = options.targetId ?? null;
  });
};

export const closeToneEditorDialog = (): void => {
  produceAppState((draft) => {
    draft.toneEditor.open = false;
  });
};
