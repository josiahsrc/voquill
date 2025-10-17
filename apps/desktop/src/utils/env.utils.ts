export const getIsDevMode = (): boolean => {
  return import.meta.env.DEV;
}

export const getIsEmulators = (): boolean => {
  return getIsDevMode() && import.meta.env.VITE_USE_EMULATORS === "true";
}
