import { invoke } from "@tauri-apps/api/core";
import { showSnackbar } from "./app.actions";

export const sendRemoteTestOutput = async (
  targetDeviceId: string,
): Promise<void> => {
  const timestamp = new Date().toLocaleTimeString();
  await invoke<void>("remote_sender_deliver_final_text", {
    args: {
      targetDeviceId,
      text: `Voquill remote tunnel test at ${timestamp}`,
      mode: "dictation",
    },
  });
  showSnackbar("Remote delivery acknowledged.");
};
