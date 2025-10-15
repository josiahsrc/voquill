import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";

export type RecordingStartedPayload = {
  started_at_ms?: number;
};

export type RecordingFinishedPayload = {
  duration_ms?: number;
  size_bytes?: number;
  transcription?: string;
};

export type RecordingErrorPayload = {
  message?: string;
};

export type RecordingState = {
  isRecording: boolean;
  startedAtMs?: number;
  lastDurationMs?: number;
  lastSizeBytes?: number;
  lastTranscription?: string;
  error?: string;
};

const isTauriEnvironment = () =>
  typeof window !== "undefined" &&
  (Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__") ||
    Object.prototype.hasOwnProperty.call(window, "__TAURI_IPC__"));

export const useRecordingTelemetry = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
  });
  const [altPressCount, setAltPressCount] = useState(0);

  const isTauri = useMemo(() => isTauriEnvironment(), []);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    let canceled = false;

    const loadPersistedCount = async () => {
      try {
        const count = await invoke<number>("get_option_key_count");
        if (!canceled && typeof count === "number") {
          setAltPressCount(count);
        }
      } catch (err) {
        console.error("Failed to load option key count", err);
      }
    };

    const runAutoUpdate = async () => {
      try {
        const update = await check();
        if (!canceled && update?.available) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (err) {
        console.error("Auto-update check failed", err);
      }
    };

    runAutoUpdate();
    loadPersistedCount();

    return () => {
      canceled = true;
    };
  }, [isTauri]);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    let canceled = false;
    const unlistenFns: Array<() => void> = [];

    const parsePayload = (
      payload: unknown,
    ): Record<string, unknown> | null => {
      if (typeof payload === "object" && payload !== null) {
        return payload as Record<string, unknown>;
      }
      if (typeof payload === "string") {
        try {
          const parsed = JSON.parse(payload);
          if (typeof parsed === "object" && parsed !== null) {
            return parsed as Record<string, unknown>;
          }
        } catch (err) {
          console.error("Failed to parse recording event payload", err);
        }
      }
      return null;
    };

    const attachListeners = async () => {
      type ListenerMapEntry = {
        event: string;
        handler: (payload: unknown) => void;
      };

      const listenerMap: ListenerMapEntry[] = [
        {
          event: "recording-started",
          handler: (payload) => {
            if (canceled) {
              return;
            }
            const parsed = parsePayload(payload) as
              | Record<string, unknown>
              | null;
            const typedPayload = (parsed ?? {}) as RecordingStartedPayload;
            setRecordingState((prev) => ({
              ...prev,
              isRecording: true,
              startedAtMs: typedPayload.started_at_ms,
              error: undefined,
            }));
          },
        },
        {
          event: "recording-finished",
          handler: (payload) => {
            if (canceled) {
              return;
            }
            const parsed = parsePayload(payload) as
              | Record<string, unknown>
              | null;
            const typedPayload = (parsed ?? {}) as RecordingFinishedPayload;
            setRecordingState({
              isRecording: false,
              startedAtMs: undefined,
              lastDurationMs: typedPayload.duration_ms,
              lastSizeBytes: typedPayload.size_bytes,
              lastTranscription: typedPayload.transcription,
              error: undefined,
            });
          },
        },
        {
          event: "recording-error",
          handler: (payload) => {
            if (canceled) {
              return;
            }
            const parsed = parsePayload(payload) as
              | Record<string, unknown>
              | null;
            const typedPayload = (parsed ?? {}) as RecordingErrorPayload;
            setRecordingState((prev) => ({
              ...prev,
              isRecording: false,
              error: typedPayload.message ?? "Recording error",
            }));
          },
        },
        {
          event: "recording-alt-key",
          handler: () => {
            if (canceled) {
              return;
            }
            setAltPressCount((prev) => prev + 1);
          },
        },
      ];

      const listeners = await Promise.all(
        listenerMap.map(async ({ event, handler }) =>
          listen(event, (payload) => handler(payload.payload)),
        ),
      );

      listeners.forEach((unlisten) => {
        if (typeof unlisten === "function") {
          unlistenFns.push(unlisten);
        }
      });
    };

    attachListeners().catch((err) => {
      console.error("Failed to attach listeners", err);
    });

    return () => {
      canceled = true;
      unlistenFns.forEach((unlisten) => unlisten());
    };
  }, [isTauri]);

  return {
    recordingState,
    altPressCount,
  };
};
