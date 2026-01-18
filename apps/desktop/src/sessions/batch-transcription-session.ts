import { transcribeAudio } from "../actions/transcribe.actions";
import {
  FinalizeOptions,
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { showErrorSnackbar } from "../actions/app.actions";

/**
 * Batch transcription session - records audio first, then transcribes all at once.
 * Only handles transcription, not post-processing.
 */
export class BatchTranscriptionSession implements TranscriptionSession {
  async onRecordingStart(_sampleRate: number): Promise<void> {
    // No-op for batch transcription - we process after recording stops
  }

  async finalize(
    audio: StopRecordingResponse,
    _options?: FinalizeOptions,
  ): Promise<TranscriptionSessionResult> {
    const payloadSamples = Array.isArray(audio.samples)
      ? audio.samples
      : Array.from(audio.samples ?? []);
    const rate = audio.sampleRate;

    if (rate == null || rate <= 0 || payloadSamples.length === 0) {
      return {
        rawTranscript: null,
        metadata: {},
        warnings: [],
      };
    }

    const warnings: string[] = [];

    try {
      const result = await transcribeAudio({
        samples: payloadSamples,
        sampleRate: rate,
      });

      return {
        rawTranscript: result.rawTranscript,
        metadata: result.metadata,
        warnings: [...warnings, ...result.warnings],
      };
    } catch (error) {
      console.error("Failed to transcribe audio", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio. Please try again.";
      if (message) {
        warnings.push(`Transcription failed: ${message}`);
        showErrorSnackbar(message);
      }

      return {
        rawTranscript: null,
        metadata: {},
        warnings,
      };
    }
  }

  cleanup(): void {
    // No-op for batch transcription
  }
}
