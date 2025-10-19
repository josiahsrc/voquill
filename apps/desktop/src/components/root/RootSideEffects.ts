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

type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sample_rate?: number;
};

type KeysHeldPayload = {
  keys: string[];
};

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResponse | null> | null>(null);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);

  useAsyncEffect(async () => {
    await loadHotkeys();
  }, []);

  const handleRecordedAudio = useCallback(async (payload: StopRecordingResponse) => {
    const payloadSamples = Array.isArray(payload.samples)
      ? payload.samples
      : Array.from(payload.samples ?? []);
    const rate = payload.sample_rate;

    if (rate == null || Number.isNaN(rate)) {
      console.error("Received audio payload without sample rate", payload);
      showErrorSnackbar("Recording missing sample rate. Please try again.");
      return;
    }

    if (rate <= 0 || payloadSamples.length === 0) {
      return;
    }

    let transcript: string;

    try {
      transcript = await invoke<string>("transcribe_audio", {
        samples: payloadSamples,
        sampleRate: rate,
      });
    } catch (error) {
      console.error("Failed to transcribe audio", error);
      const message =
        error instanceof Error ? error.message : "Unable to transcribe audio. Please try again.";
      showErrorSnackbar(message);
      return;
    }

    const normalizedTranscript = transcript.trim();
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

    try {
      await invoke<void>("paste", { text: normalizedTranscript });
    } catch (error) {
      console.error("Failed to paste transcription", error);
      showErrorSnackbar("Unable to paste transcription.");
    }
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
        await invoke<void>("set_phase", { phase: "recording" });
        await invoke<void>("start_recording");
        await invoke<void>("play_audio", { clip: "start_recording_clip" });
      } catch (error) {
        console.error("Failed to start recording via hotkey", error);
        await invoke<void>("set_phase", { phase: "idle" });
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

    const promise = (async (): Promise<StopRecordingResponse | null> => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          console.warn("Start recording rejected while stopping", error);
        }
      }

      let audio: StopRecordingResponse | null = null;

      try {
        await invoke<void>("set_phase", { phase: "loading" });
        audio = await invoke<StopRecordingResponse>("stop_recording");
        await invoke<void>("play_audio", { clip: "stop_recording_clip" });
      } catch (error) {
        console.error("Failed to stop recording via hotkey", error);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        await invoke<void>("set_phase", { phase: "idle" });
        stopPendingRef.current = null;
      }

      return audio;
    })();

    stopPendingRef.current = promise;
    const audio = await promise;

    isRecordingRef.current = false;

    if (audio) {
      await handleRecordedAudio(audio);
    }
  }, [handleRecordedAudio]);

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    onActivate: startRecording,
    onDeactivate: stopRecording,
  });

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
