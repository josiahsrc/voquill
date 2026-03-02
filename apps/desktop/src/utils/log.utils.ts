import {
  info as tauriInfo,
  warn as tauriWarn,
  error as tauriError,
  debug as tauriDebug,
  attachConsole,
} from "@tauri-apps/plugin-log";
import type { LogLevel } from "../types/log.types";

const LOG_LEVEL_KEY = "voquill_log_level";

export const getLogLevel = (): LogLevel => {
  const stored = localStorage.getItem(LOG_LEVEL_KEY);
  if (stored === "verbose" || stored === "info") return stored;
  return "info";
};

export const setLogLevel = (level: LogLevel): void => {
  localStorage.setItem(LOG_LEVEL_KEY, level);
};

type Logger = {
  info(...args: unknown[]): void;
  warning(...args: unknown[]): void;
  error(...args: unknown[]): void;
  verbose(...args: unknown[]): void;
  stopwatch<T>(label: string, fn: () => Promise<T>): Promise<T>;
};

const stringify = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack ?? arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

const logger: Logger = {
  info(...args: unknown[]) {
    void tauriInfo(stringify(args));
  },
  warning(...args: unknown[]) {
    void tauriWarn(stringify(args));
  },
  error(...args: unknown[]) {
    void tauriError(stringify(args));
  },
  verbose(...args: unknown[]) {
    if (getLogLevel() !== "verbose") return;
    void tauriDebug(stringify(args));
  },
  stopwatch<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    return fn()
      .then((result) => {
        const duration = Date.now() - start;
        this.info(`${label} completed in ${duration}ms`);
        return result;
      })
      .catch((error) => {
        const duration = Date.now() - start;
        this.error(`${label} failed in ${duration}ms`, error);
        throw error;
      });
  },
};

export const getLogger = (): Logger => logger;

export const initLogging = async (): Promise<void> => {
  await attachConsole();

  window.onerror = (_event, source, lineno, colno, error) => {
    void tauriError(
      `Uncaught error: ${error?.message ?? "unknown"} at ${source}:${lineno}:${colno}`,
    );
  };

  window.onunhandledrejection = (event) => {
    void tauriError(`Unhandled rejection: ${event.reason}`);
  };
};
