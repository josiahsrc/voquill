import crypto from "crypto";

type PendingOidcState = {
  localPort?: number;
  redirectUrl?: string;
  providerId: string;
  clientState: string;
  expiresAt: number;
};

const pendingStates = new Map<string, PendingOidcState>();
const TTL_MS = 10 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (value.expiresAt < now) {
      pendingStates.delete(key);
    }
  }
}

export function createOidcState(
  opts: { localPort?: number; redirectUrl?: string },
  providerId: string,
  clientState: string,
): string {
  cleanup();
  const serverState = crypto.randomBytes(32).toString("hex");
  pendingStates.set(serverState, {
    localPort: opts.localPort,
    redirectUrl: opts.redirectUrl,
    providerId,
    clientState,
    expiresAt: Date.now() + TTL_MS,
  });
  return serverState;
}

export function consumeOidcState(
  serverState: string,
): {
  localPort?: number;
  redirectUrl?: string;
  providerId: string;
  clientState: string;
} | null {
  cleanup();
  const entry = pendingStates.get(serverState);
  if (!entry) {
    return null;
  }
  pendingStates.delete(serverState);
  return {
    localPort: entry.localPort,
    redirectUrl: entry.redirectUrl,
    providerId: entry.providerId,
    clientState: entry.clientState,
  };
}
