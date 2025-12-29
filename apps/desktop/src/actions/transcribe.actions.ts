import { Nullable } from "@repo/types";
import { dedup, getRec } from "@repo/utilities";
import { getGenerateTextRepo, getTranscribeAudioRepo } from "../repos";
import { getAppState } from "../store";
import { PostProcessingMode, TranscriptionMode } from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import { mapLocaleToSupportedTranscriptionLocale } from "../utils/language.utils";
import {
  buildLocalizedPostProcessingPrompt,
  buildLocalizedTranscriptionPrompt,
  buildSystemPostProcessingTonePrompt,
  collectDictionaryEntries,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../utils/prompt.utils";
import {
  getMyEffectiveUserId,
  getMyPreferredLocale,
} from "../utils/user.utils";

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

  const preferredLocale = mapLocaleToSupportedTranscriptionLocale(
    getMyPreferredLocale(state),
  );

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
    language: preferredLocale,
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

    const ppPrompt = buildLocalizedPostProcessingPrompt(
      rawTranscript,
      preferredLocale,
      tone?.promptTemplate ?? null,
    );

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

  return {
    transcript: processedTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};

// Legacy combined type for backward compatibility
export type TranscriptionAudioInput = {
  samples: AudioSamples;
  sampleRate: number;
  toneId?: Nullable<string>;
};

export type TranscriptionResult = {
  transcript: string;
  rawTranscript: string;
  warnings: string[];
  metadata: TranscriptionMetadata;
};

/**
 * @deprecated Use transcribeAudio + postProcessTranscript separately for better control
 */
export const transcribeAndPostProcessAudio = async ({
  samples,
  sampleRate,
  toneId,
}: TranscriptionAudioInput): Promise<TranscriptionResult> => {
  const transcribeResult = await transcribeAudio({ samples, sampleRate });
  const postProcessResult = await postProcessTranscript({
    rawTranscript: transcribeResult.rawTranscript,
    toneId: toneId ?? null,
  });

  return {
    transcript: postProcessResult.transcript,
    rawTranscript: transcribeResult.rawTranscript,
    warnings: [...transcribeResult.warnings, ...postProcessResult.warnings],
    metadata: {
      ...transcribeResult.metadata,
      ...postProcessResult.metadata,
      rawTranscript: transcribeResult.rawTranscript,
    },
  };
};
