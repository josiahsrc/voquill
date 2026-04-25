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

type PasteOutcome = "pasted" | "copied_to_clipboard";

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

  const insertionMethod =
    currentApp?.insertionMethod ?? prefs?.insertionMethod ?? "paste";

  const typingSpeedMs = currentApp?.typingSpeedMs ?? prefs?.typingSpeedMs ?? 5;

  if (insertionMethod === "type") {
    await insertLocalTranscriptOutputViaTyping(args.text, typingSpeedMs);
  } else {
    const pasteKeybind =
      state.supportsPasteKeybinds === "global"
        ? (prefs?.pasteKeybind ?? null)
        : (currentApp?.pasteKeybind ?? prefs?.pasteKeybind ?? null);

    await insertLocalTranscriptOutputViaPaste(args.text, pasteKeybind);
  }

  return {
    delivered: true,
    remote: false,
  };
};

export const insertLocalTranscriptOutputViaPaste = async (
  text: string,
  keybind: string | null,
): Promise<void> => {
  const sanitized = sanitizeIndentation(text);

  const outcome = await invoke<PasteOutcome>("paste", {
    text: sanitized,
    keybind,
  });

  if (outcome === "copied_to_clipboard") {
    getLogger().info(
      "Focused element was not editable, transcription copied to clipboard",
    );
    sendPillFlashMessage(
      getIntl().formatMessage({
        defaultMessage: "Transcript copied to clipboard",
      }),
    );
  }
};

export const insertLocalTranscriptOutputViaTyping = async (
  text: string,
  delayMs: number,
): Promise<void> => {
  const sanitized = sanitizeIndentation(text);

  const handleCancel = () => {
    void invoke("cancel_typing");
  };

  window.addEventListener("blur", handleCancel, { once: true });
  const keydownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };
  window.addEventListener("keydown", keydownHandler);

  try {
    await invoke("simulate_type", {
      text: sanitized,
      delayMs,
    });
  } finally {
    window.removeEventListener("blur", handleCancel);
    window.removeEventListener("keydown", keydownHandler);
  }
};
