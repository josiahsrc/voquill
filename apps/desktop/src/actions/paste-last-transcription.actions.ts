import { invoke } from "@tauri-apps/api/core";
import { getTranscriptionRepo } from "../repos";
import { getAppState } from "../store";
import { getIntl } from "../i18n";
import { normalizeAppTargetId } from "../utils/apptarget.utils";
import { getLogger } from "../utils/log.utils";
import {
  findLatestPasteableTranscript,
  getLatestPasteableTranscriptFromState,
  resolveReplayPasteKeybind,
} from "../utils/paste-last-transcription.utils";
import { insertLocalTranscriptOutput } from "../utils/output-routing.utils";
import { showErrorSnackbar, showSnackbar } from "./app.actions";

const REPLAY_TRANSCRIPTION_FALLBACK_LIMIT = 20;

type CurrentAppInfoResponse = {
  appName?: string | null;
};

const getCurrentAppTargetIdForReplay = async (): Promise<string | null> => {
  const state = getAppState();
  if (
    !state.supportsAppDetection ||
    state.supportsPasteKeybinds !== "per-app"
  ) {
    return null;
  }

  try {
    const appInfo = await invoke<CurrentAppInfoResponse>(
      "get_current_app_info",
    );
    const appName = appInfo.appName?.trim() ?? "";
    return appName ? normalizeAppTargetId(appName) : null;
  } catch (error) {
    getLogger().verbose(
      `Failed to resolve current app for replay paste: ${error}`,
    );
    return null;
  }
};

const getLatestSavedTranscript = async (): Promise<string | null> => {
  const fromState = getLatestPasteableTranscriptFromState(getAppState());
  if (fromState) {
    return fromState;
  }

  const transcriptions = await getTranscriptionRepo().listTranscriptions({
    limit: REPLAY_TRANSCRIPTION_FALLBACK_LIMIT,
  });
  return findLatestPasteableTranscript(transcriptions);
};

export const pasteLastTranscription = async (): Promise<void> => {
  const intl = getIntl();

  try {
    const transcript = await getLatestSavedTranscript();
    if (!transcript) {
      showSnackbar(
        intl.formatMessage({
          defaultMessage: "No transcription to insert.",
        }),
      );
      return;
    }

    const currentAppId = await getCurrentAppTargetIdForReplay();
    const state = getAppState();
    const currentApp = currentAppId
      ? (state.appTargetById[currentAppId] ?? null)
      : null;
    const keybind = resolveReplayPasteKeybind({
      supportsPasteKeybinds: state.supportsPasteKeybinds,
      userPasteKeybind: state.userPrefs?.pasteKeybind,
      appTargetPasteKeybind: currentApp?.pasteKeybind,
    });

    await insertLocalTranscriptOutput(`${transcript} `, keybind);
    showSnackbar(
      intl.formatMessage({
        defaultMessage: "Last transcription inserted.",
      }),
      { mode: "success" },
    );
  } catch (error) {
    getLogger().error(`Failed to paste last transcription: ${error}`);
    showErrorSnackbar(
      intl.formatMessage({
        defaultMessage: "Unable to insert last transcription.",
      }),
    );
  }
};
