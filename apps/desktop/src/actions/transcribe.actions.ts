import {
  Nullable,
  Transcription,
  TranscriptionAudioSnapshot,
} from "@repo/types";
import { countWords, dedup, getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import {
  getGenerateTextRepo,
  getTranscribeAudioRepo,
  getTranscriptionRepo,
} from "../repos";
import { getAppState, produceAppState } from "../store";
import { TextFieldInfo } from "../types/accessibility.types";
import { PostProcessingMode, TranscriptionMode } from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import { StopRecordingResponse } from "../types/transcription-session.types";
import {
  applySpacingInContext,
  extractTextFieldContext,
} from "../utils/accessibility.utils";
import { createId } from "../utils/id.utils";
import { mapLocaleToWhisperLanguage } from "../utils/language.utils";
import {
  buildLocalizedPostProcessingPrompt,
  buildLocalizedTranscriptionPrompt,
  buildSystemPostProcessingTonePrompt,
  collectDictionaryEntries,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../utils/prompt.utils";
import {
  getMyDictationLanguage,
  getMyEffectiveUserId,
  getMyPreferredLocale,
} from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import { addWordsToCurrentUser } from "./user.actions";

export type TranscribeAudioInput = {
  samples: AudioSamples;
  sampleRate: number;
};

export type TranscribeAudioMetadata = {
  modelSize?: string | null;
  inferenceDevice?: string | null;
  transcriptionPrompt?: string | null;
  transcriptionApiKeyId?: string | null;
  transcriptionMode?: TranscriptionMode | null;
  transcriptionDurationMs?: number | null;
};

export type TranscribeAudioResult = {
  rawTranscript: string;
  warnings: string[];
  metadata: TranscribeAudioMetadata;
};

export type PostProcessInput = {
  rawTranscript: string;
  toneId: Nullable<string>;
  a11yInfo: Nullable<TextFieldInfo>;
};

export type PostProcessMetadata = {
  postProcessPrompt?: string | null;
  postProcessApiKeyId?: string | null;
  postProcessMode?: PostProcessingMode | null;
  postProcessDevice?: string | null;
  postprocessDurationMs?: number | null;
};

export type PostProcessResult = {
  transcript: string;
  warnings: string[];
  metadata: PostProcessMetadata;
};

// Combined metadata type for storage compatibility
export type TranscriptionMetadata = TranscribeAudioMetadata &
  PostProcessMetadata & {
    rawTranscript?: string | null;
  };

/**
 * Transcribe audio samples to text.
 * This is the first step - just converts audio to raw transcript.
 */
export const transcribeAudio = async ({
  samples,
  sampleRate,
}: TranscribeAudioInput): Promise<TranscribeAudioResult> => {
  const state = getAppState();

  const metadata: TranscribeAudioMetadata = {};
  const warnings: string[] = [];

  const {
    repo: transcribeRepo,
    apiKeyId: transcriptionApiKeyId,
    warnings: transcribeWarnings,
  } = getTranscribeAudioRepo();
  warnings.push(...transcribeWarnings);

  const preferredLocale = getMyPreferredLocale(state);
  const dictationLanguage = getMyDictationLanguage(state);
  const whisperLanguage = mapLocaleToWhisperLanguage(dictationLanguage);

  const dictionaryEntries = collectDictionaryEntries(state);
  const transcriptionPrompt = buildLocalizedTranscriptionPrompt(
    dictionaryEntries,
    preferredLocale,
  );

  const transcribeStart = performance.now();
  const transcribeOutput = await transcribeRepo.transcribeAudio({
    samples,
    sampleRate,
    prompt: transcriptionPrompt,
    language: whisperLanguage,
  });
  const transcribeDuration = performance.now() - transcribeStart;
  const rawTranscript = transcribeOutput.text.trim();

  metadata.modelSize = state.settings.aiTranscription.modelSize || null;
  metadata.inferenceDevice = transcribeOutput.metadata?.inferenceDevice || null;
  metadata.transcriptionDurationMs = Math.round(transcribeDuration);
  metadata.transcriptionPrompt = transcriptionPrompt;
  metadata.transcriptionApiKeyId = transcriptionApiKeyId;
  metadata.transcriptionMode =
    transcribeOutput.metadata?.transcriptionMode || null;

  return {
    rawTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};

/**
 * Post-process a raw transcript using LLM.
 * This is the second step - cleans up and formats the transcript based on tone.
 */
export const postProcessTranscript = async ({
  rawTranscript,
  toneId,
  a11yInfo,
}: PostProcessInput): Promise<PostProcessResult> => {
  const state = getAppState();

  const metadata: PostProcessMetadata = {};
  const warnings: string[] = [];

  const {
    repo: genRepo,
    apiKeyId: genApiKeyId,
    warnings: genWarnings,
  } = getGenerateTextRepo();
  warnings.push(...genWarnings);

  let processedTranscript = rawTranscript;

  if (genRepo) {
    const preferredLocale = getMyPreferredLocale(state);
    const myUserId = getMyEffectiveUserId(state);
    const myPrefs = getRec(state.userPreferencesById, myUserId);
    const tone =
      getRec(state.toneById, toneId) ??
      getRec(state.toneById, myPrefs?.activeToneId) ??
      null;

    const textFieldContext = extractTextFieldContext(a11yInfo);
    const ppPrompt = buildLocalizedPostProcessingPrompt({
      transcript: rawTranscript,
      locale: preferredLocale,
      toneTemplate: tone?.promptTemplate ?? null,
      textFieldContext: textFieldContext ?? null,
    });

    const ppSystem = buildSystemPostProcessingTonePrompt(preferredLocale);

    const postprocessStart = performance.now();
    const genOutput = await genRepo.generateText({
      system: ppSystem,
      prompt: ppPrompt,
      jsonResponse: {
        name: "transcription_cleaning",
        description: "JSON response with the processed transcription",
        schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
      },
    });
    const postprocessDuration = performance.now() - postprocessStart;
    metadata.postprocessDurationMs = Math.round(postprocessDuration);

    try {
      const validationResult = PROCESSED_TRANSCRIPTION_SCHEMA.safeParse(
        JSON.parse(genOutput.text),
      );
      if (!validationResult.success) {
        warnings.push(
          `Post-processing response validation failed: ${validationResult.error.message}`,
        );
      } else {
        processedTranscript =
          validationResult.data.processedTranscription.trim();
      }
    } catch (e) {
      warnings.push(
        `Failed to parse post-processing response: ${(e as Error).message}`,
      );
    }

    metadata.postProcessPrompt = ppPrompt;
    metadata.postProcessApiKeyId = genApiKeyId;
    metadata.postProcessMode = genOutput.metadata?.postProcessingMode || null;
    metadata.postProcessDevice = genOutput.metadata?.inferenceDevice || null;
  } else {
    metadata.postProcessMode = "none";
  }

  if (a11yInfo) {
    processedTranscript = applySpacingInContext({
      textToInsert: processedTranscript,
      info: a11yInfo,
    });
  } else {
    processedTranscript = processedTranscript.trim();
  }

  return {
    transcript: processedTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};

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
