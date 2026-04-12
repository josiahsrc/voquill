import { invoke } from "@tauri-apps/api/core";
import type {
  RouteTranscriptOutputArgs,
  RouteTranscriptOutputResult,
} from "@voquill/types";
import { showToast } from "../actions/toast.actions";
import { getIntl } from "../i18n/intl";
import { getAppState } from "../store";
import { getLogger } from "./log.utils";
import { sanitizeIndentation } from "./string.utils";
import { getMyUserPreferences } from "./user.utils";

type PasteMethod = "accessibility" | "clipboard" | "noTarget";

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
  if (!sanitized.trim()) return;

  let method: PasteMethod;
  try {
    method = await invoke<PasteMethod>("paste", {
      text: sanitized,
      keybind,
    });
  } catch (error) {
    getLogger().error(`Paste command failed: ${error}`);
    method = "noTarget";
  }

  if (method !== "noTarget") return;

  try {
    await invoke<void>("copy_to_clipboard", { text: sanitized });
    await showToast({
      message: getIntl().formatMessage({
        defaultMessage: "Text copied to clipboard",
      }),
      toastType: "info",
    });
  } catch (error) {
    getLogger().error(`Clipboard fallback failed: ${error}`);
  }
};
