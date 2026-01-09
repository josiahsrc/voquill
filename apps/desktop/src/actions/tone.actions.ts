import { Tone } from "@repo/types";
import { getToneRepo, getUserPreferencesRepo } from "../repos";
import { ToneEditorMode } from "../state/tone-editor.state";
import { getAppState, produceAppState } from "../store";
import { registerTones } from "../utils/app.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";

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
      const prefs = draft.userPrefs;
      if (prefs?.activeToneId === id) {
        prefs.activeToneId = null;
      }
    });

    // Sync preferences if we cleared the active tone
    const prefs = getAppState().userPrefs;
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
    const currentPrefs = getAppState().userPrefs;
    if (!currentPrefs) {
      throw new Error("User preferences not found");
    }

    const updatedPrefs = {
      ...currentPrefs,
      activeToneId: toneId,
    };

    await getUserPreferencesRepo().setUserPreferences(updatedPrefs);
    produceAppState((draft) => {
      draft.userPrefs = updatedPrefs;
    });

    showSnackbar(toneId ? "Default tone set" : "Default tone cleared", {
      mode: "success",
    });
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
  const prefs = state.userPrefs;
  const activeToneId = prefs?.activeToneId;

  if (!activeToneId) {
    return null;
  }

  return state.toneById[activeToneId] ?? null;
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
