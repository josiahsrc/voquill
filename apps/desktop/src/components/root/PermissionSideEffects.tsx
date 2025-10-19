import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  fetchInputMonitoringPermission,
  fetchMicrophonePermission,
} from "../../utils/permission.utils";
import type { PermissionStatus } from "../../types/permission.types";
import { produceAppState } from "../../store";

export const PermissionSideEffects = () => {
  useEffect(() => {
    let mounted = true;
    let checking = false;
    let refreshPending = false;
    let unlisten: (() => void) | null = null;

    const storeStatuses = (
      microphone: PermissionStatus | null,
      inputMonitoring: PermissionStatus | null,
    ) => {
      if (!mounted) {
        return;
      }

      produceAppState((draft) => {
        draft.permissions.microphone = microphone;
        draft.permissions["input-monitoring"] = inputMonitoring;
      });
    };

    const refresh = async () => {
      if (checking) {
        refreshPending = true;
        return;
      }

      checking = true;
      try {
        const [microphone, inputMonitoring] = await Promise.all([
          fetchMicrophonePermission().catch((error) => {
            console.error("Failed to fetch microphone permission", error);
            return null;
          }),
          fetchInputMonitoringPermission().catch((error) => {
            console.error("Failed to fetch keyboard permission", error);
            return null;
          }),
        ]);

        storeStatuses(microphone, inputMonitoring);
      } finally {
        checking = false;
        if (refreshPending) {
          refreshPending = false;
          void refresh();
        }
      }
    };

    void refresh();

    const windowHandle = getCurrentWindow();
    const listenPromise = windowHandle.listen("tauri://focus", () => {
      void refresh();
    });

    listenPromise
      .then((listener: () => void) => {
        if (!mounted) {
          listener();
          return;
        }
        unlisten = listener;
      })
      .catch((error: unknown) => {
        console.error("Failed to subscribe to focus events", error);
      });

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return null;
};
