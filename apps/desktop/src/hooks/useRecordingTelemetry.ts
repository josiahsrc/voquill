import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  listen,
  type EventTarget as TauriEventTarget,
} from "@tauri-apps/api/event";

export type RecordingStartedPayload = {
  started_at_ms?: number;
};

export type RecordingFinishedPayload = {
  duration_ms?: number;
  size_bytes?: number;
  transcription?: string;
};

export type RecordingProcessingPayload = {
  duration_ms?: number;
  size_bytes?: number;
};

export type RecordingErrorPayload = {
  message?: string;
};

export type RecordingState = {
  isRecording: boolean;
  isProcessing: boolean;
  startedAtMs?: number;
  lastDurationMs?: number;
  lastSizeBytes?: number;
  lastTranscription?: string;
  error?: string;
  lastEvent?: string;
  phase: "idle" | "listening" | "processing" | "done";
};

const isTauriEnvironment = () =>
  typeof window !== "undefined" &&
  (Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__") ||
    Object.prototype.hasOwnProperty.call(window, "__TAURI_IPC__"));

const getOverlayEventTarget = (): TauriEventTarget | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("overlay") === "1") {
    return { kind: "WebviewWindow", label: "recording-overlay" };
  }
  return undefined;
};

export const useRecordingTelemetry = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    lastEvent: "idle",
    phase: "idle",
  });
  const [altPressCount, setAltPressCount] = useState(0);

  const isTauri = useMemo(() => isTauriEnvironment(), []);
  const overlayTarget = useMemo(() => getOverlayEventTarget(), []);
  const isOverlay = overlayTarget !== undefined;
  const finishTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isTauri || isOverlay) {
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
  }, [isTauri, isOverlay]);

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
            console.log("Starting...")
            const parsed = parsePayload(payload) as
              | Record<string, unknown>
              | null;
            const typedPayload = (parsed ?? {}) as RecordingStartedPayload;
            setRecordingState((prev) => ({
              ...prev,
              isRecording: true,
              isProcessing: false,
              startedAtMs: typedPayload.started_at_ms,
              error: undefined,
              lastEvent: "recording-started",
              phase: "listening",
            }));
            if (finishTimerRef.current !== undefined) {
              clearTimeout(finishTimerRef.current);
              finishTimerRef.current = undefined;
            }
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
              isProcessing: false,
              startedAtMs: undefined,
              lastDurationMs: typedPayload.duration_ms,
              lastSizeBytes: typedPayload.size_bytes,
              lastTranscription: typedPayload.transcription,
              error: undefined,
              lastEvent: "recording-finished",
              phase: "done",
            });

            if (finishTimerRef.current !== undefined) {
              clearTimeout(finishTimerRef.current);
            }
            finishTimerRef.current = window.setTimeout(() => {
              setRecordingState((prev) => ({
                ...prev,
                isRecording: false,
                isProcessing: false,
                lastEvent: "idle",
                phase: "idle",
              }));
              finishTimerRef.current = undefined;
            }, 250);
          },
        },
        {
          event: "recording-processing",
          handler: (payload) => {
            if (canceled) {
              return;
            }
            const parsed = parsePayload(payload) as
              | Record<string, unknown>
              | null;
            const typedPayload = (parsed ?? {}) as RecordingProcessingPayload;
            setRecordingState((prev) => ({
              ...prev,
              isRecording: false,
              isProcessing: true,
              startedAtMs: undefined,
              lastDurationMs: typedPayload.duration_ms ?? prev.lastDurationMs,
              lastSizeBytes: typedPayload.size_bytes ?? prev.lastSizeBytes,
              lastEvent: "recording-processing",
              phase: "processing",
            }));
            if (finishTimerRef.current !== undefined) {
              clearTimeout(finishTimerRef.current);
              finishTimerRef.current = undefined;
            }
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
              isProcessing: false,
              error: typedPayload.message ?? "Recording error",
              lastEvent: "recording-error",
              phase: "idle",
            }));
            if (finishTimerRef.current !== undefined) {
              clearTimeout(finishTimerRef.current);
              finishTimerRef.current = undefined;
            }
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
        listenerMap.map(async ({ event, handler }) => {
          try {
            const register = overlayTarget
              ? await listen(
                  event,
                  (payload) => handler(payload.payload),
                  { target: overlayTarget },
                )
              : await listen(event, (payload) =>
                  handler(payload.payload),
                );
            return register;
          } catch (err) {
            console.error("[overlay] failed to listen to event", event, err);
            throw err;
          }
        }),
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
      if (finishTimerRef.current !== undefined) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = undefined;
      }
    };
  }, [isTauri]);

  return {
    recordingState,
    altPressCount,
  };
};
