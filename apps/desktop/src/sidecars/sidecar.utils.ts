import { fetch } from "@tauri-apps/plugin-http";

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

export const isTauriEnvironment = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const tauriWindow = window as typeof window & Record<string, unknown>;
  return (
    "__TAURI_INTERNALS__" in tauriWindow ||
    "__TAURI__" in tauriWindow ||
    "__TAURI_IPC__" in tauriWindow
  );
};

export const fetchWithTimeout = async (
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Request timed out: ${url}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetch(url, init), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};
