import { Transcription, TranscriptionAudioSnapshot } from "@repo/types";
import { countWords } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { getTranscriptionRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { StopRecordingResponse } from "../types/transcription-session.types";
import { createId } from "../utils/id.utils";
import { getMyEffectiveUserId } from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import {
  PostProcessMetadata,
  TranscribeAudioMetadata,
} from "./transcribe.actions";
import { addWordsToCurrentUser } from "./user.actions";

export type StoreTranscriptionInput = {
  audio: StopRecordingResponse;
  rawTranscript: string | null;
  transcript: string | null;
  transcriptionMetadata: TranscribeAudioMetadata;
  postProcessMetadata: PostProcessMetadata;
  warnings: string[];
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
    input.rawTranscript === null && input.warnings.length > 0;

  const transcription: Transcription = {
    id: transcriptionId,
    transcript: !transcriptionFailed
      ? (input.transcript ?? "")
      : "[Transcription Failed]",
    createdAt: dayjs().toISOString(),
    createdByUserId: getMyEffectiveUserId(state),
    isDeleted: false,
    audio: audioSnapshot,
    modelSize: input.transcriptionMetadata.modelSize ?? null,
    inferenceDevice: input.transcriptionMetadata.inferenceDevice ?? null,
    rawTranscript: input.rawTranscript ?? input.transcript ?? "",
    transcriptionPrompt:
      input.transcriptionMetadata.transcriptionPrompt ?? null,
    postProcessPrompt: input.postProcessMetadata.postProcessPrompt ?? null,
    transcriptionApiKeyId:
      input.transcriptionMetadata.transcriptionApiKeyId ?? null,
    postProcessApiKeyId: input.postProcessMetadata.postProcessApiKeyId ?? null,
    transcriptionMode: input.transcriptionMetadata.transcriptionMode ?? null,
    postProcessMode: input.postProcessMetadata.postProcessMode ?? null,
    postProcessDevice: input.postProcessMetadata.postProcessDevice ?? null,
    transcriptionDurationMs:
      input.transcriptionMetadata.transcriptionDurationMs ?? null,
    postprocessDurationMs:
      input.postProcessMetadata.postprocessDurationMs ?? null,
    warnings: input.warnings.length > 0 ? input.warnings : null,
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

  const wordsAdded = input.transcript ? countWords(input.transcript) : 0;
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
