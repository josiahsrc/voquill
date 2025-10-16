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

/**
 * A hook that runs asynchronous effects with proper concurrency handling.
 *
 * When dependencies change while an async effect is running, this hook will:
 * 1. Wait for the current async effect to complete
 * 2. Call the unsubscribe function from the completed effect (if any)
 * 3. Start the new async effect
 *
 * @param effect - Async function that returns a cleanup/unsubscribe function or void
 * @param deps - Dependency array that triggers the effect when changed
 */
export const useAsyncEffect = (
  effect: () => Promise<(() => void) | void>,
  deps: DependencyList,
): void => {
  const currentEffectRef = useRef<Promise<(() => void) | void> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingDepsRef = useRef<DependencyList | null>(null);
  const isUnmountedRef = useRef(false);

  // Cleanup function to run on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const runEffect = async () => {
      // If there's already an effect running, wait for it to complete
      if (currentEffectRef.current) {
        pendingDepsRef.current = deps;
        try {
          const cleanup = await currentEffectRef.current;
          // Call the cleanup function from the previous effect
          if (cleanup && !isUnmountedRef.current) {
            cleanup();
          }
        } catch (error) {
          console.error("Error in async effect cleanup:", error);
        }

        // If component was unmounted while waiting, don't continue
        if (isUnmountedRef.current) {
          return;
        }

        // If dependencies changed again while we were waiting, skip this effect
        if (pendingDepsRef.current !== deps) {
          return;
        }
      }

      // Clear any existing cleanup
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Start the new effect
      const effectPromise = effect();
      currentEffectRef.current = effectPromise;

      try {
        const cleanup = await effectPromise;

        // Only set cleanup if this is still the current effect and component is mounted
        if (
          currentEffectRef.current === effectPromise &&
          !isUnmountedRef.current
        ) {
          cleanupRef.current = cleanup || null;
        }
      } catch (error) {
        console.error("Error in async effect:", error);
      } finally {
        // Clear the current effect reference if this was the current effect
        if (currentEffectRef.current === effectPromise) {
          currentEffectRef.current = null;
        }
      }
    };

    runEffect();
  }, deps);
};
