export const getLocalStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch (e) {
    console.error("Unable to access localStorage:", e);
    return null;
  }
};
