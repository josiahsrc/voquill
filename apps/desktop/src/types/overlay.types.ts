import type { ToolPermissionResolution } from "@voquill/types";
import type { AppState } from "../state/app.state";

export type OverlayPhase = "idle" | "recording" | "loading";

export type OverlayResolvePermissionPayload = {
  permissionId: string;
  status: ToolPermissionResolution;
  alwaysAllow?: boolean;
};

export type OverlaySyncPayload = Partial<
  Pick<
    AppState,
    | "activeRecordingMode"
    | "hotkeyById"
    | "pillConversationId"
    | "assistantInputMode"
    | "chatMessageById"
    | "chatMessageIdsByConversationId"
    | "userPrefs"
    | "userById"
    | "auth"
    | "memberById"
    | "onboarding"
    | "toneById"
    | "enterpriseConfig"
    | "toolPermissionById"
    | "toolInfoById"
    | "streamingMessageById"
  >
>;
