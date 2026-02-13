import { produceAppState } from "../store";
import { getLocalStorage } from "../utils/local-storage.utils";

export const setLocalStorageValue = <T>(key: string, value: T): void => {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Unable to set localStorage key "${key}":`, e);
    }
  }
  produceAppState((draft) => {
    draft.localStorageCache[key] = value;
  });
};

export const clearLocalStorageValue = (key: string): void => {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch (e) {
      console.error(`Unable to remove localStorage key "${key}":`, e);
    }
  }
  produceAppState((draft) => {
    delete draft.localStorageCache[key];
  });
};
