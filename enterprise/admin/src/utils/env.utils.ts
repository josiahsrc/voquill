export function getGatewayUrl(): string {
  return import.meta.env.VITE_GATEWAY_URL || "http://localhost:4630";
}

export function isDev(): boolean {
  return import.meta.env.DEV;
}

export function getAppName(): string {
  return import.meta.env.VITE_APP_NAME || "Voquill Enterprise";
}

export function getAppVersion(): string {
  return import.meta.env.VITE_VERSION || "0.0.1";
}
