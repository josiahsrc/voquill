import type { AppState } from "../state/app.state";

export type OverlayPhase = "idle" | "recording" | "loading";

export type OverlaySyncPayload = Pick<
  AppState,
  "hotkeyById" | "agent" | "userPrefs"
>;
