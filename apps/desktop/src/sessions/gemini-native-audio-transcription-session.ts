import { geminiProcessAudio, getGeminiModelId } from "@repo/voice-ai";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { buildWaveFile, ensureFloat32Array } from "../utils/audio.utils";

const GEMINI_END_TO_END_INSTRUCTIONS =
  "You are a dictation assistant. The user dictated the attached audio file. Please output text that a user would have written if instead of saying this they had written it. This includes reworking to the extent necessary to feel concise, correct and polished, as one expects with written text.";

export class GeminiNativeAudioTranscriptionSession
  implements TranscriptionSession
{
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async onRecordingStart(_sampleRate: number): Promise<void> {}

  async finalize(
    audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    const payloadSamples = Array.isArray(audio.samples)
      ? audio.samples
      : Array.from(audio.samples ?? []);
    const rate = audio.sampleRate;

    if (!rate || rate <= 0 || payloadSamples.length === 0) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • Gemini (End-to-End)",
          transcriptionMode: "api",
        },
        warnings: ["No audio data to process"],
      };
    }

    try {
      const floatSamples = ensureFloat32Array(payloadSamples);
      const wavBuffer = buildWaveFile(floatSamples, rate);
      const finalizeStart = performance.now();

      const result = await geminiProcessAudio({
        apiKey: this.apiKey,
        model: getGeminiModelId(this.model),
        blob: wavBuffer,
        mimeType: "audio/wav",
        instructions: GEMINI_END_TO_END_INSTRUCTIONS,
      });

      const durationMs = Math.round(performance.now() - finalizeStart);
      const transcript = result.text.trim() || null;

      console.log("[Gemini End-to-End] Result:", {
        durationMs,
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript,
        processedTranscript: transcript,
        metadata: {
          inferenceDevice: "API • Gemini (End-to-End)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        postProcessMetadata: {
          postProcessMode: "api",
          postProcessDevice: "API • Gemini (End-to-End)",
          postprocessDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Gemini End-to-End] Failed:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • Gemini (End-to-End)",
          transcriptionMode: "api",
        },
        warnings: [
          `Gemini end-to-end failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  cleanup(): void {}
}
