import { Nullable } from "@repo/types";
import {
  transcribeAndPostProcessAudio,
  TranscriptionMetadata,
} from "../actions/transcribe.actions";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { showErrorSnackbar } from "../actions/app.actions";

export class BatchTranscriptionSession implements TranscriptionSession {
  private toneId: Nullable<string>;

  constructor(toneId: Nullable<string>) {
    this.toneId = toneId;
  }

  async onRecordingStart(_sampleRate: number): Promise<void> {
    // No-op for batch transcription - we process after recording stops
  }

  async finalize(
    audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    const payloadSamples = Array.isArray(audio.samples)
      ? audio.samples
      : Array.from(audio.samples ?? []);
    const rate = audio.sampleRate;

    if (rate == null || rate <= 0 || payloadSamples.length === 0) {
      return {
        transcript: null,
        rawTranscript: null,
        metadata: {},
        warnings: [],
      };
    }

    let transcript: string | null = null;
    let rawTranscript: string | null = null;
    const warnings: string[] = [];
    let metadata: TranscriptionMetadata = {};

    try {
      const result = await transcribeAndPostProcessAudio({
        samples: payloadSamples,
        sampleRate: rate,
        toneId: this.toneId,
      });
      transcript = result.transcript;
      rawTranscript = result.rawTranscript;
      warnings.push(...result.warnings);
      metadata = result.metadata;
    } catch (error) {
      console.error("Failed to transcribe or post-process audio", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio. Please try again.";
      if (message) {
        warnings.push(`Transcription failed: ${message}`);
        showErrorSnackbar(message);
      }
    }

    return {
      transcript,
      rawTranscript,
      metadata,
      warnings,
    };
  }

  cleanup(): void {
    // No-op for batch transcription
  }
}
