import {
  useTauriListen as useTauriListenBase,
  type UseTauriListenOptions,
} from "@voquill/desktop-utils";
import { showErrorSnackbar } from "../actions/app.actions";

const surfaceError = (error: unknown) => showErrorSnackbar(error);

/**
 * Desktop-app wrapper around the shared `useTauriListen` hook that routes
 * handler/listen errors to the in-app snackbar instead of the default
 * `console.error` fallback.
 */
export const useTauriListen = <T = unknown>(
  eventName: string,
  callback: (event: T) => void | Promise<void>,
  options?: Omit<UseTauriListenOptions, "onError">,
) => {
  useTauriListenBase<T>(eventName, callback, {
    ...options,
    onError: surfaceError,
  });
};
