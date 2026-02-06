import { getAppState } from "../store";
import { getEffectiveAuth } from "./auth.utils";
import { getMyUserPreferences } from "./user.utils";

export const NEW_SERVER_URL = "https://api.voquill.com";

export function getIsNewBackendEnabled(): boolean {
  const state = getAppState();
  const prefs = getMyUserPreferences(state);
  return prefs?.useNewBackend ?? false;
}

export async function getNewServerAuthHeaders(): Promise<
  Record<string, string>
> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const auth = getEffectiveAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }
  const idToken = await user.getIdToken();
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  return headers;
}
