export const getLocalStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch (e) {
    console.error("Unable to access localStorage:", e);
    return null;
  }
};

export const getLocalStorageBool = (key: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(key);
    return raw !== null ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
};
