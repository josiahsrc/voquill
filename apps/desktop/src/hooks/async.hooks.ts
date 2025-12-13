import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";
import { AsyncData } from "../types/async.types";

export const useAsyncData = <T>(
  promise: () => Promise<T>,
  deps: DependencyList,
): AsyncData<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a safety timeout (30 seconds) to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      setError("Request timed out");
      setLoading(false);
    }, 30000);

    try {
      const result = await promise();
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      // Clear the timeout and set loading to false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refresh();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  if (loading) {
    return { state: "loading", refresh };
  } else if (error) {
    console.log("Error:", error);
    return { state: "error", error, refresh };
  }

  return { state: "success", data: data as T, refresh };
};

export const useAsyncEffect = (
  effect: () => Promise<(() => void) | void>,
  deps: DependencyList,
): void => {
  const cleanupRef = useRef<(() => void) | void>(undefined);
  const runningRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Wait for any previous effect to complete before running cleanup
      if (runningRef.current) {
        await runningRef.current;
      }

      // Run the previous cleanup if it exists
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }

      if (cancelled) return;

      // Run the new effect and store its cleanup
      const cleanup = await effect();
      if (!cancelled) {
        cleanupRef.current = cleanup;
      } else if (cleanup) {
        // If cancelled while effect was running, clean up immediately
        cleanup();
      }
    };

    runningRef.current = run();

    return () => {
      cancelled = true;
      // Schedule cleanup to run after current effect completes
      runningRef.current?.then(() => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = undefined;
        }
      });
    };
  }, deps);
};
