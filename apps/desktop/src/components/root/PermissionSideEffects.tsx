import { useCallback, useEffect, useRef } from "react";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { produceAppState } from "../../store";
import { resolvePermissionRequestLifecycle } from "../../utils/permission-flow.utils";
import {
  checkAccessibilityPermission,
  checkMicrophonePermission,
} from "../../utils/permission.utils";

export const PermissionSideEffects = () => {
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

  const refreshPermissions = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    try {
  // NOTE: screen-recording permission is intentionally NOT polled here.
  // Screen-recording is an optional, enhancement-only feature gated behind a "Coming soon"
  // UI label.  Its permission state is seeded at startup (not-determined or authorized via
  // the native check) and is updated only when the user interacts with the Permissions dialog.
  // TODO: When the "Coming soon" gate is lifted, add checkScreenRecordingPermission() here
  // alongside the microphone/accessibility calls so the status chip stays current.
  const [microphone, accessibility] = await Promise.all([
        checkMicrophonePermission().catch((error) => {
          console.error("Failed to fetch microphone permission", error);
          return null;
        }),
        checkAccessibilityPermission().catch((error) => {
          console.error("Failed to fetch accessibility permission", error);
          return null;
        }),
      ]);

      if (mountedRef.current) {
        produceAppState((draft) => {
          if (microphone) {
            draft.permissions.microphone = microphone;
            if (!draft.permissionRequests.microphone.requestInFlight) {
              draft.permissionRequests.microphone =
                resolvePermissionRequestLifecycle({
                  kind: "microphone",
                  status: microphone,
                  requestInFlight:
                    draft.permissionRequests.microphone.requestInFlight,
                  awaitingExternalApproval:
                    draft.permissionRequests.microphone
                      .awaitingExternalApproval,
                });
            }
          }

          if (accessibility) {
            draft.permissions.accessibility = accessibility;
            if (!draft.permissionRequests.accessibility.requestInFlight) {
              draft.permissionRequests.accessibility =
                resolvePermissionRequestLifecycle({
                  kind: "accessibility",
                  status: accessibility,
                  requestInFlight:
                    draft.permissionRequests.accessibility.requestInFlight,
                  awaitingExternalApproval:
                    draft.permissionRequests.accessibility
                      .awaitingExternalApproval,
                });
            }
          }
        });
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshPermissions();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshPermissions]);

  useIntervalAsync(1000, refreshPermissions, [refreshPermissions]);

  return null;
};
