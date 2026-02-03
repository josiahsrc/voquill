import { Tone } from "@repo/types";
import { getIntl } from "../i18n/intl";
import { getToneRepo, getUserPreferencesRepo } from "../repos";
import { ToneEditorMode } from "../state/tone-editor.state";
import { getAppState, produceAppState } from "../store";
import { registerTones } from "../utils/app.utils";
import {
  getActiveManualToneIds,
  getManuallySelectedToneId,
  getToneById,
} from "../utils/tone.utils";
import { flashPillTooltip } from "../utils/overlay.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";
import { showToast } from "./toast.actions";
import { activateAndSelectTone, setSelectedToneId } from "./user.actions";

export const loadTones = async (): Promise<void> => {
  const tones = await getToneRepo().listTones();
  produceAppState((draft) => {
    registerTones(draft, tones);
  });
};

export const upsertTone = async (tone: Tone): Promise<Tone> => {
  try {
    const saved = await getToneRepo().upsertTone(tone);

    produceAppState((draft) => {
      registerTones(draft, [saved]);
      draft.tones.selectedToneId = saved.id;
      draft.tones.isCreating = false;
    });

    await activateAndSelectTone(saved.id);

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

const cycleWritingStyle = async (direction: 1 | -1): Promise<void> => {
  const state = getAppState();
  const activeIds = getActiveManualToneIds(state);
  const currentId = getManuallySelectedToneId(state);
  const intl = getIntl();

  if (activeIds.length <= 1) {
    const toneName = getToneById(state, currentId)?.name ?? currentId;
    await showToast({
      title: intl.formatMessage({
        defaultMessage: "Writing style not changed",
      }),
      message: intl.formatMessage(
        {
          defaultMessage:
            '"{toneName}" is your only active style. Add more styles from the writing styles menu.',
        },
        { toneName },
      ),
      toastType: "info",
    });
    return;
  }

  const currentIndex = activeIds.indexOf(currentId);
  const nextIndex =
    (currentIndex + direction + activeIds.length) % activeIds.length;
  const nextId = activeIds[nextIndex];
  await setSelectedToneId(nextId);

  flashPillTooltip();
};

export const switchWritingStyleForward = () => cycleWritingStyle(1);
export const switchWritingStyleBackward = () => cycleWritingStyle(-1);

export const closeToneEditorDialog = (): void => {
  produceAppState((draft) => {
    draft.toneEditor.open = false;
  });
};
