interface VoquillEnv {
  VOQUILL_GATEWAY_URL?: string;
  VOQUILL_APP_NAME?: string;
}

declare global {
  interface Window {
    __VOQUILL__?: VoquillEnv;
  }
}

export function getGatewayUrl(): string {
  return window.__VOQUILL__?.VOQUILL_GATEWAY_URL || "http://localhost:4630";
}

export function isDev(): boolean {
  return import.meta.env.DEV;
}

export function getAppName(): string {
  return window.__VOQUILL__?.VOQUILL_APP_NAME || "Voquill Enterprise";
}

export function getAppVersion(): string {
  return import.meta.env.VITE_VERSION || "0.0.1";
}
