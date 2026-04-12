import { invoke } from "@tauri-apps/api/core";
import type {
  RouteTranscriptOutputArgs,
  RouteTranscriptOutputResult,
} from "@voquill/types";
import { getAppState } from "../store";
import { sanitizeIndentation } from "./string.utils";
import { getMyUserPreferences } from "./user.utils";

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
  await invoke<void>("paste", {
    text: sanitizeIndentation(text),
    keybind,
  });
};
