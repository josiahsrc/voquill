import {
  AzureStreamingSession,
  createAzureStreamingSession,
} from "@repo/voice-ai";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { getAppState } from "../store";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import {
  buildLocalizedTranscriptionPrompt,
  collectDictionaryEntries,
} from "../utils/prompt.utils";
import { loadMyEffectiveDictationLanguage } from "../utils/user.utils";

export class AzureTranscriptionSession implements TranscriptionSession {
  private session: AzureStreamingSession | null = null;
  private subscriptionKey: string;
  private region: string;
  private unlisten: UnlistenFn | null = null;
  private receivedChunkCount = 0;

  constructor(subscriptionKey: string, region: string) {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
  }

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[Azure] Starting streaming session...");

      const state = getAppState();
      const language = await loadMyEffectiveDictationLanguage(state);
      const dictionaryEntries = collectDictionaryEntries(state);
      const prompt = buildLocalizedTranscriptionPrompt({
        entries: dictionaryEntries,
        dictationLanguage: language,
        state,
      });

      this.session = await createAzureStreamingSession({
        subscriptionKey: this.subscriptionKey,
        region: this.region,
        sampleRate,
        language,
        prompt: prompt || undefined,
      });

      this.unlisten = await listen<{ samples: number[] }>(
        "audio_chunk",
        (event) => {
          this.receivedChunkCount++;
          if (
            this.receivedChunkCount <= 3 ||
            this.receivedChunkCount % 10 === 0
          ) {
            console.log(
              `[Azure] Received chunk #${this.receivedChunkCount}, samples:`,
              event.payload.samples.length,
            );
          }

          if (this.session) {
            try {
              const typedChunk =
                event.payload.samples instanceof Float32Array
                  ? event.payload.samples
                  : Float32Array.from(event.payload.samples);

              this.session.writeAudioChunk(typedChunk);
            } catch (error) {
              console.error("[Azure] Error writing audio chunk:", error);
            }
          }
        },
      );

      console.log("[Azure] Streaming session started successfully");
    } catch (error) {
      console.error("[Azure] Failed to start streaming:", error);
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • Azure (Streaming)",
          transcriptionMode: "api",
        },
        warnings: ["Azure streaming session was not established"],
      };
    }

    try {
      console.log("[Azure] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize();
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[Azure] Transcript timing:", { durationMs });
      console.log("[Azure] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "API • Azure (Streaming)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Azure] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • Azure (Streaming)",
          transcriptionMode: "api",
        },
        warnings: [
          `Azure finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  cleanup(): void {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    if (this.session) {
      this.session.cleanup();
      this.session = null;
    }
  }
}
