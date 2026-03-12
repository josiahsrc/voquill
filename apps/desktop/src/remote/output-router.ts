import type {
  RouteTranscriptOutputArgs,
  RouteTranscriptOutputResult,
} from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";
import { getMyUserPreferences } from "../utils/user.utils";

// VRT-1 establishes the routing boundary and preference contract.
// Remote delivery is wired in later slices; this keeps local behavior intact for now.
export const routeTranscriptOutput = async (
  args: RouteTranscriptOutputArgs,
): Promise<RouteTranscriptOutputResult> => {
  const state = getAppState();
  const prefs = getMyUserPreferences(state);
  const currentApp = args.currentAppId
    ? state.appTargetById[args.currentAppId] ?? null
    : null;

  if (prefs?.remoteOutputEnabled && prefs.remoteTargetDeviceId) {
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

  await invoke<void>("paste", {
    text: args.text,
    keybind: currentApp?.pasteKeybind ?? null,
  });
  return {
    delivered: true,
    remote: false,
  };
};
