import { invoke } from "@tauri-apps/api/core";

export const sendPillFlashMessage = (message: string): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({
      type: "toast",
      message,
      toast_type: "info",
      duration: null,
      action: null,
      action_label: null,
    }),
  }).catch(console.error);
};

export const sendPillFireworks = (message: string): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "fireworks", message }),
  }).catch(console.error);
};

export const sendPillFlame = (message: string): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "flame", message }),
  }).catch(console.error);
};

export const sendPillFlashBlue = (): void => {
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "flash_blue" }),
  }).catch(console.error);
};

const clipTranscriptToLastWords = (text: string, maxWords = 10): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return "..." + words.slice(-maxWords).join(" ");
};

export const sendPillBroadcastTranscript = (text: string): void => {
  const clipped = clipTranscriptToLastWords(text);
  invoke("sync_native_pill_assistant", {
    payload: JSON.stringify({ type: "broadcast_transcript", text: clipped }),
  }).catch(console.error);
};
