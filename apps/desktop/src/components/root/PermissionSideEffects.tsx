import { useCallback, useEffect, useRef } from "react";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { produceAppState } from "../../store";
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
          draft.permissions.microphone = microphone;
          draft.permissions.accessibility = accessibility;
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
