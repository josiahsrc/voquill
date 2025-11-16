import { dedup, getRec } from "@repo/utilities";
import { getGenerateTextRepo, getTranscribeAudioRepo } from "../repos";
import { getAppState } from "../store";
import { PostProcessingMode, TranscriptionMode } from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import {
  buildLocalizedPostProcessingPrompt,
  buildLocalizedTranscriptionPrompt,
  buildSystemPostProcessingTonePrompt,
  collectDictionaryEntries,
} from "../utils/prompt.utils";
import { getMyEffectiveUserId, getMyPreferredLocale } from "../utils/user.utils";
import { Nullable } from "@repo/types";

export type TranscriptionAudioInput = {
  samples: AudioSamples;
  sampleRate: number;
  toneId?: Nullable<string>;
};

export type TranscriptionMetadata = {
  modelSize?: string | null;
  inferenceDevice?: string | null;
  rawTranscript?: string | null;
  transcriptionPrompt?: string | null;
  postProcessPrompt?: string | null;
  transcriptionApiKeyId?: string | null;
  postProcessApiKeyId?: string | null;
  transcriptionMode?: TranscriptionMode | null;
  postProcessMode?: PostProcessingMode | null;
  postProcessDevice?: string | null;
};

export type TranscriptionResult = {
  transcript: string;
  rawTranscript: string;
  warnings: string[];
  metadata: TranscriptionMetadata;
};

export const transcribeAndPostProcessAudio = async ({
  samples,
  sampleRate,
  toneId,
}: TranscriptionAudioInput): Promise<TranscriptionResult> => {
  const state = getAppState();

  const metadata: TranscriptionMetadata = {};
  const warnings: string[] = [];

  const { repo: transcribeRepo, apiKeyId: transcriptionApiKeyId, warnings: transcribeWarnings } = getTranscribeAudioRepo();
  warnings.push(...transcribeWarnings);

  const { repo: genRepo, apiKeyId: genApiKeyId, warnings: genWarnings } = getGenerateTextRepo();
  warnings.push(...genWarnings);

  // transcribe the audio
  const preferredLocale = getMyPreferredLocale(state);
  const dictionaryEntries = collectDictionaryEntries(state);
  const transcriptionPrompt = buildLocalizedTranscriptionPrompt(
    dictionaryEntries,
    preferredLocale,
  );

  const transcribeOutput = await transcribeRepo.transcribeAudio({
    samples,
    sampleRate,
    prompt: transcriptionPrompt,
    language: preferredLocale,
  });
  const rawTranscript = transcribeOutput.text.trim();
  metadata.modelSize = state.settings.aiTranscription.modelSize || null;
  metadata.inferenceDevice = transcribeOutput.metadata?.inferenceDevice || null;
  metadata.rawTranscript = rawTranscript;
  metadata.transcriptionPrompt = transcriptionPrompt;
  metadata.transcriptionApiKeyId = transcriptionApiKeyId;
  metadata.transcriptionMode = transcribeOutput.metadata?.transcriptionMode || null;

  // post-process the transcription
  let processedTranscript = rawTranscript;
  if (genRepo) {
    const myUserId = getMyEffectiveUserId(state);
    const myPrefs = getRec(state.userPreferencesById, myUserId);
    const tone = getRec(state.toneById, toneId)
      ?? getRec(state.toneById, myPrefs?.activeToneId)
      ?? null;
      console.log("tone.promptTemplate", tone?.promptTemplate);

    const ppPrompt = buildLocalizedPostProcessingPrompt(
      rawTranscript,
      dictionaryEntries,
      preferredLocale,
      tone?.promptTemplate ?? null,
    );

    const ppSystem = buildSystemPostProcessingTonePrompt(preferredLocale);

    const genOutput = await genRepo.generateText({
      system: ppSystem,
      prompt: ppPrompt,
    });

    processedTranscript = genOutput.text.trim();
    metadata.postProcessPrompt = ppPrompt;
    metadata.postProcessApiKeyId = genApiKeyId;
    metadata.postProcessMode = genOutput.metadata?.postProcessingMode || null;
    metadata.postProcessDevice = genOutput.metadata?.inferenceDevice || null;
  } else {
    metadata.postProcessMode = "none";
  }

  return {
    transcript: processedTranscript,
    rawTranscript: rawTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};
