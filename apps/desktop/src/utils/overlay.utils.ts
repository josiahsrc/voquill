import { emitTo } from "@tauri-apps/api/event";

export const flashPillTooltip = (duration = 2000): void => {
  emitTo("pill-overlay", "flash_pill_tooltip", { duration }).catch(
    console.error,
  );
};
