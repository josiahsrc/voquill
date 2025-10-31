import { firemix } from "@firemix/client";
import { Transcription, TranscriptionAudioSnapshot } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useRef } from "react";
import { loadApiKeys } from "../../actions/api-key.actions";
import { showErrorSnackbar } from "../../actions/app.actions";
import { loadHotkeys } from "../../actions/hotkey.actions";
import { addWordsToCurrentUser } from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { getTranscriptionRepo } from "../../repos";
import { getAppState, produceAppState } from "../../store";
import { OverlayPhase } from "../../types/overlay.types";
import { DICTATE_HOTKEY } from "../../utils/keyboard.utils";
import {
  transcribeAndPostProcessAudio,
  TranscriptionError,
  type TranscriptionMetadata,
} from "../../utils/transcription.utils";
import { getMyUser, getMyUserId } from "../../utils/user.utils";
import { loadDictionary } from "../../actions/dictionary.actions";
import { checkForAppUpdates } from "../../actions/updater.actions";
import {
  consumeSurfaceWindowFlag,
  surfaceMainWindow,
} from "../../utils/window.utils";
import { useIntervalAsync } from "../../hooks/helper.hooks";

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

const countWords = (text: string): number => {
  const tokens = text.trim().split(/\s+/);
  return tokens.filter((token) => token.length > 0).length;
};

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResponse | null> | null>(null);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const overlayLoadingTokenRef = useRef<symbol | null>(null);

  useAsyncEffect(async () => {
    const loaders: Promise<unknown>[] = [loadHotkeys(), loadApiKeys(), loadDictionary()];
    await Promise.allSettled(loaders);
  }, []);

  useAsyncEffect(async () => {
    if (consumeSurfaceWindowFlag()) {
      await surfaceMainWindow();
    }
  }, []);

  useIntervalAsync(60 * 1000, async () => {
    await checkForAppUpdates();
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

    let finalTranscript: string | null = null;
    let rawTranscriptValue: string | null = null;
    let warnings: string[] = [];
    let metadata: TranscriptionMetadata | undefined;

    try {
      const result = await transcribeAndPostProcessAudio({
        samples: payloadSamples,
        sampleRate: rate,
      });
      finalTranscript = result.transcript;
      rawTranscriptValue = result.rawTranscript;
      warnings = result.warnings;
      metadata = result.metadata;
    } catch (error) {
      console.error("Failed to transcribe or post-process audio", error);
      const message =
        error instanceof TranscriptionError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to transcribe audio. Please try again.";
      if (message) {
        showErrorSnackbar(message);
      }
      return;
    }

    if (!finalTranscript) {
      return;
    }

    if (warnings.length > 0) {
      for (const warning of warnings) {
        showErrorSnackbar(warning);
      }
    }

    const state = getAppState();

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
      transcript: finalTranscript,
      createdAt: firemix().now(),
      createdByUserId: getMyUserId(state),
      isDeleted: false,
      audio: audioSnapshot,
      modelSize: metadata?.modelSize ?? null,
      inferenceDevice: metadata?.inferenceDevice ?? null,
      rawTranscript: rawTranscriptValue ?? finalTranscript,
      transcriptionPrompt: metadata?.transcriptionPrompt ?? null,
      postProcessPrompt: metadata?.postProcessPrompt ?? null,
      transcriptionApiKeyId: metadata?.transcriptionApiKeyId ?? null,
      postProcessApiKeyId: metadata?.postProcessApiKeyId ?? null,
      transcriptionMode: metadata?.transcriptionMode ?? null,
      postProcessMode: metadata?.postProcessMode ?? null,
      postProcessDevice: metadata?.postProcessDevice ?? null,
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

    const wordsAdded = countWords(finalTranscript);
    if (wordsAdded > 0) {
      try {
        await addWordsToCurrentUser(wordsAdded);
      } catch (error) {
        console.error("Failed to update usage metrics", error);
      }
    }

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
      await invoke<void>("paste", { text: finalTranscript });
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
        overlayLoadingTokenRef.current = null;
        await Promise.all([
          invoke<void>("set_phase", { phase: "recording" }),
          invoke<void>("start_recording", {
            args: { preferredMicrophone },
          }),
          ...(playInteractionChime ? [invoke<void>("play_audio", { clip: "start_recording_clip" })] : []),
        ]);
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

    let loadingToken: symbol | null = null;

    const promise = (async (): Promise<StopRecordingResponse | null> => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          console.warn("Start recording rejected while stopping", error);
        }
      }

      const playInteractionChime =
        getMyUser(getAppState())?.playInteractionChime ?? true;

      let audio: StopRecordingResponse | null = null;
      try {
        loadingToken = Symbol("overlay-loading");
        overlayLoadingTokenRef.current = loadingToken;
        const [, outAudio] = await Promise.all([
          await invoke<void>("set_phase", { phase: "loading" }),
          await invoke<StopRecordingResponse>("stop_recording"),
          (playInteractionChime ? invoke<void>("play_audio", { clip: "stop_recording_clip" }) : Promise.resolve()),
        ]);

        audio = outAudio;
      } catch (error) {
        console.error("Failed to stop recording via hotkey", error);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        stopPendingRef.current = null;
      }

      return audio;
    })();

    stopPendingRef.current = promise;
    const audio = await promise;

    isRecordingRef.current = false;

    try {
      if (audio) {
        await handleRecordedAudio(audio);
      }
    } finally {
      if (loadingToken && overlayLoadingTokenRef.current === loadingToken) {
        overlayLoadingTokenRef.current = null;
        await invoke<void>("set_phase", { phase: "idle" });
      }
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
