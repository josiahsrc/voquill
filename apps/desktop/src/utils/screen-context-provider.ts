import { invoke } from "@tauri-apps/api/core";
import type { ScreenCaptureContext } from "../types/accessibility.types";

export const getScreenCaptureContext =
  async (): Promise<ScreenCaptureContext> => {
    try {
      return await invoke<ScreenCaptureContext>("get_screen_capture_context");
    } catch {
      return null;
    }
  };
