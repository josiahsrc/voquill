import { invoke } from "@tauri-apps/api/core";
import type {
  RouteTranscriptOutputArgs,
  RouteTranscriptOutputResult,
} from "@voquill/types";
import { getIntl } from "../i18n/intl";
import { getAppState } from "../store";
import { getLogger } from "./log.utils";
import { sendPillFlashMessage } from "./overlay.utils";
import { sanitizeIndentation } from "./string.utils";
import { getMyUserPreferences } from "./user.utils";

type PasteTargetState = "editable" | "not_editable" | "unknown";

export const routeTranscriptOutput = async (
  args: RouteTranscriptOutputArgs,
): Promise<RouteTranscriptOutputResult> => {
  const state = getAppState();
  const prefs = getMyUserPreferences(state);
  const currentApp = args.currentAppId
    ? (state.appTargetById[args.currentAppId] ?? null)
    : null;

  if (prefs?.remoteOutputEnabled && prefs.remoteTargetDeviceId) {
    if (!args.text.trim()) {
      return {
        delivered: false,
        remote: true,
      };
    }

    await invoke<void>("remote_sender_deliver_final_text", {
      args: {
        targetDeviceId: prefs.remoteTargetDeviceId,
        text: args.text,
        mode: args.mode,
      },
    });

    return {
      delivered: true,
      remote: true,
    };
  }

  const pasteKeybind =
    state.supportsPasteKeybinds === "global"
      ? (prefs?.pasteKeybind ?? null)
      : (currentApp?.pasteKeybind ?? prefs?.pasteKeybind ?? null);

  await insertLocalTranscriptOutput(args.text, pasteKeybind);

  return {
    delivered: true,
    remote: false,
  };
};

export const insertLocalTranscriptOutput = async (
  text: string,
  keybind: string | null,
): Promise<void> => {
  const sanitized = sanitizeIndentation(text);

  checkFocusedPasteTarget().then((target) => {
    if (target === "not_editable") {
      getLogger().info(
        "Focused element was not editable, copying transcription to clipboard",
      );
      copyToClipboardFallback(sanitized);
    }
  });

  await invoke<void>("paste", {
    text: sanitized,
    keybind,
  });
};

const checkFocusedPasteTarget = async (): Promise<PasteTargetState> => {
  try {
    return await invoke<PasteTargetState>("check_focused_paste_target");
  } catch (error) {
    getLogger().verbose(`check_focused_paste_target failed: ${error}`);
    return "unknown";
  }
};

const copyToClipboardFallback = async (text: string): Promise<void> => {
  try {
    await invoke<void>("copy_to_clipboard", { text });
    sendPillFlashMessage(
      getIntl().formatMessage({
        defaultMessage: "Transcript copied to clipboard",
      }),
    );
  } catch (error) {
    getLogger().error(`Clipboard fallback failed: ${error}`);
    sendPillFlashMessage(
      getIntl().formatMessage({
        defaultMessage: "Couldn't paste transcription",
      }),
    );
  }
};
