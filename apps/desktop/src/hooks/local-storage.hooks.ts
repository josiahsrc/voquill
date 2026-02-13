import { useCallback, useEffect, useMemo } from "react";
import { setLocalStorageValue } from "../actions/local-storage.actions";
import { produceAppState, useAppStore } from "../store";
import { getLocalStorage } from "../utils/local-storage.utils";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const cached = useAppStore((state) => state.localStorageCache[key]);

  const value = useMemo(() => {
    if (cached !== undefined) return cached as T;
    const storage = getLocalStorage();
    if (!storage) return defaultValue;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
    return defaultValue;
  }, [cached, key, defaultValue]);

  useEffect(() => {
    if (cached === undefined) {
      produceAppState((draft) => {
        draft.localStorageCache[key] = value;
      });
    }
  }, [cached, key, value]);

  const setValue = useCallback(
    (newValue: T) => {
      setLocalStorageValue(key, newValue);
    },
    [key],
  );

  return [value, setValue];
}
