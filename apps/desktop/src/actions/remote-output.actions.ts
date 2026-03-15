import { invoke } from "@tauri-apps/api/core";
import { showSnackbar } from "./app.actions";

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
