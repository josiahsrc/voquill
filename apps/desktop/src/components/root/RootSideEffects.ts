import { firemix } from "@firemix/client";
import { Transcription, TranscriptionAudioSnapshot } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useRef } from "react";
import { transcribeAudioWithGroq, postProcessTranscriptionWithGroq } from "@repo/voice-ai";
import { showErrorSnackbar } from "../../actions/app.actions";
import { useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { getTranscriptionRepo } from "../../repos";
import { getAppState, produceAppState } from "../../store";
import { DICTATE_HOTKEY } from "../../utils/keyboard.utils";
import {
  getMyUser,
  getMyUserId,
  getPostProcessingPreferenceFromState,
  getTranscriptionPreferenceFromState,
} from "../../utils/user.utils";
import { buildWaveFile, ensureFloat32Array } from "../../utils/audio.utils";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { loadHotkeys } from "../../actions/hotkey.actions";
import { OverlayPhase } from "../../types/overlay.types";

type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

type KeysHeldPayload = {
  keys: string[];
};

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
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
    const rate = payload.sampleRate;

    if (rate == null || Number.isNaN(rate)) {
      console.error("Received audio payload without sample rate", payload);
      showErrorSnackbar("Recording missing sample rate. Please try again.");
      return;
    }

    if (rate <= 0 || payloadSamples.length === 0) {
      return;
    }

    const state = getAppState();
    const transcriptionSettings = state.settings.aiTranscription;
    const transcriptionPreference = getTranscriptionPreferenceFromState(state);
    const postProcessingSettings = state.settings.aiPostProcessing;
    const postProcessingPreference = getPostProcessingPreferenceFromState(state);

    const shouldUseApiTranscription = transcriptionSettings.mode === "api";
    let useGroqTranscription = false;
    let groqTranscriptionKey: string | null = null;

    if (shouldUseApiTranscription) {
      if (
        !transcriptionPreference ||
        transcriptionPreference.mode !== "api" ||
        !transcriptionPreference.apiKeyId
      ) {
        showErrorSnackbar("API transcription requires a configured key.");
        return;
      }

      const apiKeyRecord = state.apiKeyById[transcriptionPreference.apiKeyId];
      if (!apiKeyRecord) {
        showErrorSnackbar("API transcription key not found.");
        return;
      }

      if (apiKeyRecord.provider === "groq") {
        const apiKeyValue = apiKeyRecord.keyFull?.trim();
        if (!apiKeyValue) {
          showErrorSnackbar("Groq transcription requires a valid API key.");
          return;
        }
        useGroqTranscription = true;
        groqTranscriptionKey = apiKeyValue;
      } else {
        showErrorSnackbar("Unsupported transcription provider.");
        return;
      }
    }

    let transcript: string;

    if (useGroqTranscription && groqTranscriptionKey) {
      try {
        const floatSamples = ensureFloat32Array(payloadSamples);
        const wavBuffer = buildWaveFile(floatSamples, rate);
        transcript = await transcribeAudioWithGroq({
          apiKey: groqTranscriptionKey,
          audio: wavBuffer,
          ext: "wav",
        });
      } catch (error) {
        console.error("Failed to transcribe audio with Groq", error);
        const message =
          error instanceof Error
            ? error.message
            : "Unable to transcribe audio with Groq. Please try again.";
        showErrorSnackbar(message);
        return;
      }
    } else {
      try {
        transcript = await invoke<string>("transcribe_audio", {
          samples: payloadSamples,
          sampleRate: rate,
        });
      } catch (error) {
        console.error("Failed to transcribe audio", error);
        const message =
          error instanceof Error
            ? error.message
            : "Unable to transcribe audio. Please try again.";
        showErrorSnackbar(message);
        return;
      }
    }

    let normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      return;
    }

    const shouldUseApiPostProcessing = postProcessingSettings.mode === "api";
    let useGroqPostProcessing = false;
    let groqPostProcessingKey: string | null = null;

    if (shouldUseApiPostProcessing) {
      if (
        !postProcessingPreference ||
        postProcessingPreference.mode !== "api" ||
        !postProcessingPreference.apiKeyId
      ) {
        showErrorSnackbar("API post-processing requires a configured key.");
      } else {
        const postKeyRecord =
          state.apiKeyById[postProcessingPreference.apiKeyId];
        if (!postKeyRecord) {
          showErrorSnackbar("API post-processing key not found.");
        } else if (postKeyRecord.provider === "groq") {
          const postKeyValue = postKeyRecord.keyFull?.trim();
          if (!postKeyValue) {
            showErrorSnackbar("Groq post-processing requires a valid API key.");
          } else {
            useGroqPostProcessing = true;
            groqPostProcessingKey = postKeyValue;
          }
        } else {
          showErrorSnackbar("Unsupported post-processing provider.");
        }
      }
    }

    if (useGroqPostProcessing && groqPostProcessingKey) {
      try {
        normalizedTranscript = (
          await postProcessTranscriptionWithGroq({
            apiKey: groqPostProcessingKey,
            transcript: normalizedTranscript,
          })
        ).trim();
        if (!normalizedTranscript) {
          return;
        }
      } catch (error) {
        console.error("Failed to post-process transcription with Groq", error);
        showErrorSnackbar(
          "Post-processing failed. Using original transcript.",
        );
      }
    }

    const transcriptionId = crypto.randomUUID();

    let audioSnapshot: TranscriptionAudioSnapshot | undefined;
    try {
      audioSnapshot = await invoke<TranscriptionAudioSnapshot>("store_transcription_audio", {
        id: transcriptionId,
        samples: payloadSamples,
        sampleRate: rate,
      });
    } catch (error) {
      console.error("Failed to persist audio snapshot", error);
    }

    const transcription: Transcription = {
      id: transcriptionId,
      transcript: normalizedTranscript,
      createdAt: firemix().now(),
      createdByUserId: getMyUserId(state),
      isDeleted: false,
      audio: audioSnapshot,
    };

    let storedTranscription: Transcription;

    try {
      storedTranscription = await getTranscriptionRepo().createTranscription(transcription);
    } catch (error) {
      console.error("Failed to store transcription", error);
      showErrorSnackbar("Unable to save transcription. Please try again.");
      return;
    }

    produceAppState((draft) => {
      draft.transcriptionById[storedTranscription.id] = storedTranscription;
      const existingIds = draft.transcriptions.transcriptionIds.filter(
        (identifier) => identifier !== storedTranscription.id,
      );
      draft.transcriptions.transcriptionIds = [storedTranscription.id, ...existingIds];
    });

    try {
      const purgedIds = await getTranscriptionRepo().purgeStaleAudio();
      if (purgedIds.length > 0) {
        produceAppState((draft) => {
          for (const purgedId of purgedIds) {
            const purged = draft.transcriptionById[purgedId];
            if (purged) {
              delete purged.audio;
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to purge stale audio snapshots", error);
    }

    try {
      await invoke<void>("paste", { text: normalizedTranscript });
    } catch (error) {
      console.error("Failed to paste transcription", error);
      showErrorSnackbar("Unable to paste transcription.");
    }
  }, []);

  const startRecording = useCallback(async () => {
    const state = getAppState();
    if (state.isRecordingHotkey) {
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

    const user = getMyUser(state);
    const preferredMicrophone = user?.preferredMicrophone ?? null;
    const playInteractionChime = user?.playInteractionChime ?? true;

    const promise = (async () => {
      try {
        await invoke<void>("set_phase", { phase: "recording" });
        await invoke<void>("start_recording", {
          args: { preferredMicrophone },
        });
        if (playInteractionChime) {
          await invoke<void>("play_audio", { clip: "start_recording_clip" });
        }
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
        const playInteractionChime =
          getMyUser(getAppState())?.playInteractionChime ?? true;
        if (playInteractionChime) {
          await invoke<void>("play_audio", { clip: "stop_recording_clip" });
        }
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

  useTauriListen<OverlayPhasePayload>("overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.overlayPhase = payload.phase;
      if (payload.phase !== "recording") {
        draft.audioLevels = [];
      }
    });
  });

  useTauriListen<RecordingLevelPayload>("recording_level", (payload) => {
    const raw = Array.isArray(payload.levels) ? payload.levels : [];
    const sanitized = raw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0,
    );

    produceAppState((draft) => {
      draft.audioLevels = sanitized;
    });
  });

  return null;
};
