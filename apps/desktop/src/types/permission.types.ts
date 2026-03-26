import { Nullable } from "@voquill/types";

export type PermissionKind = "microphone" | "accessibility";

export type PermissionState =
  | "authorized"
  | "denied"
  | "restricted"
  | "not-determined";

export type PermissionStatus = {
  kind: PermissionKind;
  state: PermissionState;
  promptShown: boolean;
};

export type PermissionMap = Record<PermissionKind, Nullable<PermissionStatus>>;
