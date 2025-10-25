import { postProcessTranscriptionWithGroq, transcribeAudioWithGroq } from "@repo/voice-ai";
import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";
import {
  getPostProcessingPreferenceFromState,
  getTranscriptionPreferenceFromState,
} from "./user.utils";
import { buildWaveFile, ensureFloat32Array } from "./audio.utils";

export class TranscriptionError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TranscriptionError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export type TranscriptionAudioInput = {
  samples: number[] | Float32Array | null | undefined;
  sampleRate: number | null | undefined;
};

export type TranscriptionResult = {
  transcript: string;
  warnings: string[];
};

const normalizeSamples = (
  samples: number[] | Float32Array | null | undefined,
): number[] =>
  Array.isArray(samples) ? samples : Array.from(samples ?? []);

export const transcribeAndPostProcessAudio = async ({
  samples,
  sampleRate,
}: TranscriptionAudioInput): Promise<TranscriptionResult> => {
  if (sampleRate == null || Number.isNaN(sampleRate)) {
    throw new TranscriptionError(
      "Recording missing sample rate. Please try again.",
    );
  }

  if (sampleRate <= 0) {
    throw new TranscriptionError("Recording sample rate is invalid.");
  }

  const normalizedSamples = normalizeSamples(samples);
  if (normalizedSamples.length === 0) {
    throw new TranscriptionError("Recording contains no audio samples.");
  }

  const state = getAppState();
  const transcriptionSettings = state.settings.aiTranscription;
  const transcriptionPreference = getTranscriptionPreferenceFromState(state);
  const shouldUseApiTranscription = transcriptionSettings.mode === "api";

  let transcript: string;

  if (shouldUseApiTranscription) {
    if (
      !transcriptionPreference ||
      transcriptionPreference.mode !== "api" ||
      !transcriptionPreference.apiKeyId
    ) {
      throw new TranscriptionError(
        "API transcription requires a configured key.",
      );
    }

    const apiKeyRecord = state.apiKeyById[transcriptionPreference.apiKeyId];
    if (!apiKeyRecord) {
      throw new TranscriptionError("API transcription key not found.");
    }

    if (apiKeyRecord.provider !== "groq") {
      throw new TranscriptionError("Unsupported transcription provider.");
    }

    const apiKeyValue = apiKeyRecord.keyFull?.trim();
    if (!apiKeyValue) {
      throw new TranscriptionError(
        "Groq transcription requires a valid API key.",
      );
    }

    try {
      const floatSamples = ensureFloat32Array(normalizedSamples);
      const wavBuffer = buildWaveFile(floatSamples, sampleRate);
      transcript = await transcribeAudioWithGroq({
        apiKey: apiKeyValue,
        audio: wavBuffer,
        ext: "wav",
      });
    } catch (error) {
      console.error("Failed to transcribe audio with Groq", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio with Groq. Please try again.";
      throw new TranscriptionError(message, error);
    }
  } else {
    try {
      transcript = await invoke<string>("transcribe_audio", {
        samples: normalizedSamples,
        sampleRate,
      });
    } catch (error) {
      console.error("Failed to transcribe audio", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio. Please try again.";
      throw new TranscriptionError(message, error);
    }
  }

  const normalizedTranscript = transcript.trim();
  if (!normalizedTranscript) {
    throw new TranscriptionError("Transcription produced no text.");
  }

  const warnings: string[] = [];
  const postProcessingSettings = state.settings.aiPostProcessing;
  const postProcessingPreference = getPostProcessingPreferenceFromState(state);
  const shouldUseApiPostProcessing = postProcessingSettings.mode === "api";
  let groqPostProcessingKey: string | null = null;

  if (shouldUseApiPostProcessing) {
    if (
      !postProcessingPreference ||
      postProcessingPreference.mode !== "api" ||
      !postProcessingPreference.apiKeyId
    ) {
      warnings.push("API post-processing requires a configured key.");
    } else {
      const postKeyRecord =
        state.apiKeyById[postProcessingPreference.apiKeyId];
      if (!postKeyRecord) {
        warnings.push("API post-processing key not found.");
      } else if (postKeyRecord.provider !== "groq") {
        warnings.push("Unsupported post-processing provider.");
      } else {
        const postKeyValue = postKeyRecord.keyFull?.trim();
        if (!postKeyValue) {
          warnings.push("Groq post-processing requires a valid API key.");
        } else {
          groqPostProcessingKey = postKeyValue;
        }
      }
    }
  }

  let finalTranscript = normalizedTranscript;

  if (groqPostProcessingKey) {
    try {
      const processed = await postProcessTranscriptionWithGroq({
        apiKey: groqPostProcessingKey,
        transcript: normalizedTranscript,
      });
      const trimmedProcessed = processed.trim();
      if (trimmedProcessed) {
        finalTranscript = trimmedProcessed;
      } else {
        warnings.push(
          "Post-processing returned no text. Using original transcript.",
        );
      }
    } catch (error) {
      console.error("Failed to post-process transcription with Groq", error);
      warnings.push("Post-processing failed. Using original transcript.");
    }
  }

  return {
    transcript: finalTranscript,
    warnings,
  };
};
