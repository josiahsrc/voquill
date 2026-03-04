import { showToast } from "../actions/toast.actions";
import { transcribeAudio } from "../actions/transcribe.actions";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { getLogger } from "../utils/log.utils";

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
  ): Promise<TranscriptionSessionResult> {
    const payloadSamples = Array.isArray(audio.samples)
      ? audio.samples
      : Array.from(audio.samples ?? []);
    const rate = audio.sampleRate;

    if (rate == null || rate <= 0 || payloadSamples.length === 0) {
      getLogger().warning(
        `Batch session: skipping transcription (rate=${rate}, samples=${payloadSamples.length})`,
      );
      return {
        rawTranscript: null,
        metadata: {},
        warnings: [],
      };
    }

    const warnings: string[] = [];

    try {
      getLogger().info(
        `Batch transcription: ${payloadSamples.length} samples at ${rate}Hz`,
      );
      const result = await transcribeAudio({
        samples: payloadSamples,
        sampleRate: rate,
      });

      getLogger().info(
        `Batch transcription result: ${result.rawTranscript.length} chars`,
      );
      return {
        rawTranscript: result.rawTranscript,
        metadata: result.metadata,
        warnings: [...warnings, ...result.warnings],
      };
    } catch (error) {
      getLogger().error(`Failed to transcribe audio: ${error}`);
      const message = String(error);
      if (message) {
        warnings.push(`Transcription failed: ${message}`);
        showToast({
          title: "Transcription failed",
          message,
          toastType: "error",
        });
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
