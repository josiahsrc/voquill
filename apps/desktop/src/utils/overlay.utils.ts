import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";

export const flashPillTooltip = (duration = 2000): void => {
  emitTo("pill-overlay", "flash_pill_tooltip", { duration }).catch(
    console.error,
  );
};

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
