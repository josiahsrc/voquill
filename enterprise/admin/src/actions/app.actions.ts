import { produceAppState } from "../store";
import { setSnackbar, type ShowSnackbarOpts } from "../utils/app.utils";

export const showSnackbar = (
  message: string,
  opts?: ShowSnackbarOpts,
): void => {
  const defaultDuration = message.length > 100 ? 10000 : 5000;
  produceAppState((state) => {
    setSnackbar(state, message, { duration: defaultDuration, ...opts });
  });
};

export const showErrorSnackbar = (message: unknown): void => {
  showSnackbar(String(message), { mode: "error" });
};
