import { getHotkeyRepo } from "../repos";
import { produceAppState } from "../store";
import { registerHotkeys } from "../utils/app.utils";
import { showErrorSnackbar } from "./app.actions";

export const loadHotkeys = async (): Promise<void> => {
  produceAppState((draft) => {
    draft.settings.hotkeysStatus = "loading";
  });

  try {
    const hotkeys = await getHotkeyRepo().listHotkeys();
    produceAppState((draft) => {
      registerHotkeys(draft, hotkeys);
      draft.settings.hotkeyIds = hotkeys.map((hotkey) => hotkey.id);
      draft.settings.hotkeysStatus = "success";
    });
  } catch (error) {
    console.error("Failed to load hotkeys", error);
    produceAppState((draft) => {
      draft.settings.hotkeysStatus = "error";
    });
    showErrorSnackbar("Failed to load hotkeys. Please try again.");
  }
};
