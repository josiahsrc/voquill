export function getGatewayUrl(): string {
  return import.meta.env.VITE_GATEWAY_URL || "http://localhost:3000";
}

export function isDev(): boolean {
  return import.meta.env.DEV;
}

export function getAppName(): string {
  return import.meta.env.VITE_APP_NAME || "Voquill Enterprise";
}
