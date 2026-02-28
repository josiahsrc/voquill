export const getIsDevMode = (): boolean => {
  return import.meta.env.DEV;
};

export const getIsEmulators = (): boolean => {
  return (
    getIsDevMode() && (import.meta.env.VITE_USE_EMULATORS ?? "true") === "true"
  );
};

export type Flavor = "emulators" | "dev" | "prod";
export const getFlavor = (): Flavor =>
  (import.meta.env.VITE_FLAVOR ?? "emulators") as Flavor;

export const isEmulators = () => getFlavor() === "emulators";
export const isDev = () => getFlavor() === "dev";
export const isProd = () => getFlavor() === "prod";

export const getStripePublicKey = (): string =>
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ??
  "pk_test_51RlrV0RRNItZsxS66JQL5BVyBEbK58H5V6JwjfBfoWfFIPmJABUEiE2JueOzfaFW9wdqyfpJpZ5UGZxTYOApgO8800h1HQPIZz";

export type Platform = "darwin" | "win32" | "linux";

export const getPlatform = (): Platform => {
  // Allow override via environment variable
  const override = import.meta.env.VOQUILL_DESKTOP_PLATFORM as
    | Platform
    | undefined;
  if (override) {
    return override;
  }

  // Detect from navigator.userAgent (navigator.platform is deprecated)
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) {
    return "darwin";
  }
  if (userAgent.includes("win")) {
    return "win32";
  }
  return "linux";
};

export const isMacOS = (): boolean => getPlatform() === "darwin";
export const isWindows = (): boolean => getPlatform() === "win32";
export const isLinux = (): boolean => getPlatform() === "linux";

export const isWindows10 = (): boolean => {
  if (!isWindows()) {
    return false;
  }

  const userAgent = navigator.userAgent;
  const match = userAgent.match(/Windows NT 10\.0.*build[:/\s]*(\d+)/i);
  if (match) {
    const build = parseInt(match[1], 10);
    return build < 22000;
  }

  const uaData = (
    navigator as Navigator & { userAgentData?: { platform: string } }
  ).userAgentData;
  if (uaData?.platform === "Windows") {
    return userAgent.includes("Windows NT 10.0");
  }

  return userAgent.includes("Windows NT 10.0");
};

export const isWindows11 = (): boolean => {
  if (!isWindows()) {
    return false;
  }

  const userAgent = navigator.userAgent;
  const match = userAgent.match(/Windows NT 10\.0.*build[:/\s]*(\d+)/i);
  if (match) {
    const build = parseInt(match[1], 10);
    return build >= 22000;
  }

  return false;
};
