import type {
  PermissionGateState,
  PermissionGateStateInput,
  PermissionRequestLifecycle,
} from "../types/permission.types";
import {
  isPermissionAuthorized,
  isPermissionDenied,
  isPermissionRestricted,
} from "./permission.utils";

export const derivePermissionGateState = ({
  kind,
  status,
  requestInFlight,
  awaitingExternalApproval,
}: PermissionGateStateInput): PermissionGateState => {
  const state = status?.state;
  const isAuthorized = isPermissionAuthorized(state);
  const isWaitingForExternalApproval =
    kind === "accessibility" &&
    awaitingExternalApproval &&
    !requestInFlight &&
    !isAuthorized;

  return {
    canRequest:
      !requestInFlight &&
      !isAuthorized &&
      !isPermissionRestricted(state) &&
      !isWaitingForExternalApproval,
    isAwaitingExternalApproval: isWaitingForExternalApproval,
    shouldOpenSettings:
      isPermissionDenied(state) &&
      !requestInFlight &&
      !isWaitingForExternalApproval,
  };
};

export const resolvePermissionRequestLifecycle = ({
  kind,
  status,
  requestInFlight,
  awaitingExternalApproval,
}: PermissionGateStateInput): PermissionRequestLifecycle => {
  const state = status?.state;
  const isAuthorized = isPermissionAuthorized(state);

  if (isAuthorized) {
    return {
      requestInFlight: false,
      awaitingExternalApproval: false,
    };
  }

  const shouldKeepAwaitingExternalApproval =
    kind === "accessibility" &&
    !isPermissionDenied(state) &&
    !isPermissionRestricted(state) &&
    ((requestInFlight && Boolean(status?.promptShown)) ||
      awaitingExternalApproval);

  return {
    requestInFlight: false,
    awaitingExternalApproval: shouldKeepAwaitingExternalApproval,
  };
};
