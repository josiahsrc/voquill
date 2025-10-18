import { firemix } from "@firemix/client";
import { Transcription } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useRef } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { getTranscriptionRepo } from "../../repos";
import { getAppState, produceAppState } from "../../store";
import { DICTATE_HOTKEY } from "../../utils/keyboard.utils";
import { getMyUserId } from "../../utils/user.utils";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { loadHotkeys } from "../../actions/hotkey.actions";

type TranscriptionReceivedPayload = {
  text: string;
};

type KeysHeldPayload = {
  keys: string[];
};

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<void> | null>(null);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);

  useAsyncEffect(async () => {
    await loadHotkeys();
  }, []);

  const startRecording = useCallback(async () => {
    const isHotkeyRecording = getAppState().isRecordingHotkey;
    if (isHotkeyRecording) {
      return;
    }

    if (isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = true;
    if (startPendingRef.current) {
      await startPendingRef.current;
      return;
    }

    const promise = (async () => {
      try {
        await invoke<void>("start_recording");
      } catch (error) {
        console.error("Failed to start recording via hotkey", error);
        showErrorSnackbar("Unable to start recording. Please try again.");
        suppressUntilRef.current = Date.now() + 1_000;
      } finally {
        startPendingRef.current = null;
      }
    })();

    startPendingRef.current = promise;
    await promise;
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    if (stopPendingRef.current) {
      await stopPendingRef.current;
      return;
    }

    const promise = (async () => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          console.warn("Start recording rejected while stopping", error);
        }
      }

      try {
        await invoke<void>("stop_recording");
      } catch (error) {
        console.error("Failed to stop recording via hotkey", error);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        stopPendingRef.current = null;
      }
    })();

    stopPendingRef.current = promise;
    await promise;

    isRecordingRef.current = false;
  }, []);

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    onActivate: startRecording,
    onDeactivate: stopRecording,
  });

  useTauriListen<TranscriptionReceivedPayload>(
    "transcription_received",
    async (payload) => {
      const normalizedTranscript = payload.text.trim();
      if (!normalizedTranscript) {
        return;
      }

      const transcription: Transcription = {
        id: crypto.randomUUID(),
        transcript: normalizedTranscript,
        createdAt: firemix().now(),
        createdByUserId: getMyUserId(getAppState()),
        isDeleted: false,
      };

      await getTranscriptionRepo().createTranscription(transcription);
    },
  );

  useTauriListen<KeysHeldPayload>("keys_held", (payload) => {
    const existing = getAppState().keysHeld;
    if (isEqual(existing, payload.keys)) {
      return;
    }

    produceAppState((draft) => {
      draft.keysHeld = payload.keys;
    });
  });

  return null;
};
