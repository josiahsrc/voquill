import { Transcription, TranscriptionAudioSnapshot } from "@repo/types";
import { countWords } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { getTranscriptionRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  StopRecordingResponse,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { createId } from "../utils/id.utils";
import { getMyEffectiveUserId } from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import { addWordsToCurrentUser } from "./user.actions";

export type StoreTranscriptionInput = {
  audio: StopRecordingResponse;
  result: TranscriptionSessionResult;
};

export type StoreTranscriptionOutput = {
  transcription: Transcription | null;
  wordCount: number;
};

export const storeTranscription = async (
  input: StoreTranscriptionInput,
): Promise<StoreTranscriptionOutput> => {
  const payloadSamples = Array.isArray(input.audio.samples)
    ? input.audio.samples
    : Array.from(input.audio.samples ?? []);
  const rate = input.audio.sampleRate;

  if (rate == null || Number.isNaN(rate)) {
    console.error("Received audio payload without sample rate", input.audio);
    showErrorSnackbar("Recording missing sample rate. Please try again.");
    return { transcription: null, wordCount: 0 };
  }

  if (rate <= 0 || payloadSamples.length === 0) {
    return { transcription: null, wordCount: 0 };
  }

  const state = getAppState();
  const transcriptionId = createId();

  let audioSnapshot: TranscriptionAudioSnapshot | undefined;
  try {
    audioSnapshot = await invoke<TranscriptionAudioSnapshot>(
      "store_transcription_audio",
      {
        id: transcriptionId,
        samples: payloadSamples,
        sampleRate: rate,
      },
    );
  } catch (error) {
    console.error("Failed to persist audio snapshot", error);
  }

  const transcriptionFailed =
    input.result.transcript === null && input.result.warnings.length > 0;

  const transcription: Transcription = {
    id: transcriptionId,
    transcript: !transcriptionFailed
      ? (input.result.transcript ?? "")
      : "[Transcription Failed]",
    createdAt: dayjs().toISOString(),
    createdByUserId: getMyEffectiveUserId(state),
    isDeleted: false,
    audio: audioSnapshot,
    modelSize: input.result.metadata.modelSize ?? null,
    inferenceDevice: input.result.metadata.inferenceDevice ?? null,
    rawTranscript: input.result.rawTranscript ?? input.result.transcript ?? "",
    transcriptionPrompt: input.result.metadata.transcriptionPrompt ?? null,
    postProcessPrompt: input.result.metadata.postProcessPrompt ?? null,
    transcriptionApiKeyId: input.result.metadata.transcriptionApiKeyId ?? null,
    postProcessApiKeyId: input.result.metadata.postProcessApiKeyId ?? null,
    transcriptionMode: input.result.metadata.transcriptionMode ?? null,
    postProcessMode: input.result.metadata.postProcessMode ?? null,
    postProcessDevice: input.result.metadata.postProcessDevice ?? null,
    transcriptionDurationMs:
      input.result.metadata.transcriptionDurationMs ?? null,
    postprocessDurationMs: input.result.metadata.postprocessDurationMs ?? null,
    warnings: input.result.warnings.length > 0 ? input.result.warnings : null,
  };

  let storedTranscription: Transcription;

  try {
    storedTranscription =
      await getTranscriptionRepo().createTranscription(transcription);
  } catch (error) {
    console.error("Failed to store transcription", error);
    showErrorSnackbar("Unable to save transcription. Please try again.");
    return { transcription: null, wordCount: 0 };
  }

  produceAppState((draft) => {
    draft.transcriptionById[storedTranscription.id] = storedTranscription;
    const existingIds = draft.transcriptions.transcriptionIds.filter(
      (identifier) => identifier !== storedTranscription.id,
    );
    draft.transcriptions.transcriptionIds = [
      storedTranscription.id,
      ...existingIds,
    ];
  });

  const wordsAdded = input.result.transcript
    ? countWords(input.result.transcript)
    : 0;
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

  return { transcription: storedTranscription, wordCount: wordsAdded };
};
