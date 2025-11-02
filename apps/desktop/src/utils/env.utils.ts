export const getIsDevMode = (): boolean => {
  return import.meta.env.DEV;
}

export const getIsEmulators = (): boolean => {
  return getIsDevMode() && (import.meta.env.VITE_USE_EMULATORS ?? "true") === "true";
}

export type Flavor = "emulators" | "dev" | "prod";
export const getFlavor = (): Flavor => (import.meta.env.VITE_FLAVOR ?? "emulators") as Flavor;

export const isEmulators = () => getFlavor() === "emulators";
export const isDev = () => getFlavor() === "dev";
export const isProd = () => getFlavor() === "prod";
