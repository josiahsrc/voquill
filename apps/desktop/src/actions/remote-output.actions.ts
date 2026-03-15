import { invoke } from "@tauri-apps/api/core";
import { getActiveRemoteTarget } from "../remote/device.store";
import { getAppState } from "../store";
import { showErrorSnackbar, showSnackbar } from "./app.actions";

export const sendRemoteTestOutput = async (
  targetDeviceId: string,
): Promise<void> => {
  await invoke<void>("remote_sender_deliver_final_text", {
    args: {
      targetDeviceId,
      text: "remote-transport-test",
      mode: "test",
    },
  });
  showSnackbar("Remote test acknowledged.");
};

export const sendTextToActiveRemoteTarget = async (
  text: string,
  mode: "dictation" | "test" = "dictation",
): Promise<void> => {
  const state = getAppState();
  const target = getActiveRemoteTarget(state);
  if (!target) {
    showErrorSnackbar("Select a remote target device first.");
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    showErrorSnackbar("There is no text to send.");
    return;
  }

  await invoke<void>("remote_sender_deliver_final_text", {
    args: {
      targetDeviceId: target.id,
      text: trimmed,
      mode,
    },
  });

  showSnackbar(`Sent to ${target.name}.`, { mode: "success" });
};
