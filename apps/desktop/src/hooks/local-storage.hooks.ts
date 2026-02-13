import { useCallback, useEffect, useMemo } from "react";
import { produceAppState, useAppStore } from "../store";

const getStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const setLocalStorageValue = <T>(key: string, value: T): void => {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
  produceAppState((draft) => {
    draft.localStorageCache[key] = value;
  });
};

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const cached = useAppStore((state) => state.localStorageCache[key]);

  const value = useMemo(() => {
    if (cached !== undefined) return cached as T;
    const storage = getStorage();
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
