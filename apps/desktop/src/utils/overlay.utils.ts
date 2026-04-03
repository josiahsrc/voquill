import { invoke } from "@tauri-apps/api/core";

export const sendPillFlashMessage = (message: string): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "flash_message", message }),
  }).catch(console.error);
};

export const sendPillFireworks = (message: string): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "fireworks", message }),
  }).catch(console.error);
};
