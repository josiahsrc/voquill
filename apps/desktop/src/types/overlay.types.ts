import type { AppState } from "../state/app.state";

export type OverlayPhase = "idle" | "recording" | "loading";

export type OverlaySyncPayload = Partial<
  Pick<
    AppState,
    | "hotkeyById"
    | "agent"
    | "userPrefs"
    | "userById"
    | "auth"
    | "memberById"
    | "onboarding"
    | "toneById"
    | "enterpriseConfig"
  >
>;
