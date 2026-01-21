import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  FinalizeOptions,
  RecordingStartOptions,
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";

type GoogleChirpTranscriptEvent = {
  text: string;
  is_final: boolean;
};

type GoogleChirpStreamingSession = {
  finalize: () => Promise<string>;
  cleanup: () => void;
};

const startGoogleChirpStreaming = async (
  serviceAccountJson: string,
  sampleRate: number,
  language?: string,
): Promise<GoogleChirpStreamingSession> => {
  console.log("[Google Chirp] Starting gRPC stream with sample rate:", sampleRate);

  return new Promise((resolve, reject) => {
    let unlistenAudio: UnlistenFn | null = null;
    let unlistenTranscript: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;
    let finalTranscript = "";
    let partialTranscript = "";
    let isFinalized = false;
    let receivedChunkCount = 0;

    const getText = () => {
      return (
        finalTranscript +
        (partialTranscript
          ? (finalTranscript ? " " : "") + partialTranscript
          : "")
      );
    };

    const cleanup = () => {
      if (unlistenAudio) {
        unlistenAudio();
        unlistenAudio = null;
      }
      if (unlistenTranscript) {
        unlistenTranscript();
        unlistenTranscript = null;
      }
      if (unlistenError) {
        unlistenError();
        unlistenError = null;
      }
    };

    let finalizeResolver: ((text: string) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalize = (): Promise<string> => {
      return new Promise((resolveFinalize) => {
        console.log(
          "[Google Chirp] Finalize called, isFinalized:",
          isFinalized,
        );
        if (isFinalized) {
          console.log(
            "[Google Chirp] Already finalized, returning transcript",
          );
          resolveFinalize(getText());
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;
        console.log("[Google Chirp] Total chunks received:", receivedChunkCount);

        console.log("[Google Chirp] Sending finalize command to Rust...");
        invoke("finalize_google_chirp_stream")
          .then((finalText) => {
            console.log("[Google Chirp] Received final transcript from Rust");
            if (typeof finalText === "string" && finalText) {
              finalTranscript = finalText;
              partialTranscript = "";
            }
            completeFinalize();
          })
          .catch((err) => {
            console.error("[Google Chirp] Finalize command error:", err);
            completeFinalize();
          });

        finalizeTimeout = setTimeout(() => {
          console.log(
            "[Google Chirp] Timeout reached, finalizing with transcript:",
            getText(),
          );
          cleanup();
          if (finalizeResolver) {
            finalizeResolver(getText());
            finalizeResolver = null;
          }
        }, 5000);
      });
    };

    const completeFinalize = () => {
      if (finalizeTimeout) {
        clearTimeout(finalizeTimeout);
        finalizeTimeout = null;
      }
      if (finalizeResolver) {
        console.log(
          "[Google Chirp] Completing finalize with transcript:",
          getText(),
        );
        cleanup();
        finalizeResolver(getText());
        finalizeResolver = null;
      }
    };

    const initialize = async () => {
      try {
        console.log("[Google Chirp] Invoking start_google_chirp_stream command...");
        await invoke("start_google_chirp_stream", {
          serviceAccountJson,
          sampleRate,
          language: language || "en-US",
        });
        console.log("[Google Chirp] gRPC stream started successfully");

        unlistenTranscript = await listen<GoogleChirpTranscriptEvent>(
          "google_chirp_transcript",
          (event) => {
            const { text, is_final } = event.payload;
            console.log("[Google Chirp] Received transcript:", { text: text.substring(0, 50), is_final });

            if (is_final && text) {
              finalTranscript += (finalTranscript ? " " : "") + text;
              partialTranscript = "";
              console.log(
                "[Google Chirp] Final transcript received:",
                finalTranscript.substring(0, 100),
              );
              if (isFinalized) {
                completeFinalize();
              }
            } else if (!is_final && text) {
              partialTranscript = text;
            }
          },
        );

        unlistenError = await listen<{ error: string }>(
          "google_chirp_error",
          (event) => {
            console.error("[Google Chirp] Error from server:", event.payload.error);
          },
        );

        unlistenAudio = await listen<{ samples: number[] }>(
          "audio_chunk",
          async (event) => {
            receivedChunkCount++;
            if (receivedChunkCount <= 3 || receivedChunkCount % 10 === 0) {
              console.log(
                `[Google Chirp] Received audio chunk #${receivedChunkCount}, samples:`,
                event.payload.samples.length,
              );
            }
            if (!isFinalized) {
              try {
                await invoke("send_google_chirp_audio", {
                  samples: event.payload.samples,
                });
              } catch (error) {
                console.error(
                  "[Google Chirp] Error sending audio chunk:",
                  error,
                );
              }
            }
          },
        );

        console.log("[Google Chirp] Session ready, listeners attached");
        resolve({ finalize, cleanup });
      } catch (error) {
        console.error("[Google Chirp] Error starting stream:", error);
        cleanup();
        reject(error);
      }
    };

    initialize();
  });
};

export class GoogleChirpTranscriptionSession implements TranscriptionSession {
  private session: GoogleChirpStreamingSession | null = null;
  private serviceAccountJson: string;

  constructor(serviceAccountJson: string) {
    this.serviceAccountJson = serviceAccountJson;
  }

  async onRecordingStart(options: RecordingStartOptions): Promise<void> {
    try {
      console.log("[Google Chirp] Starting streaming session...");
      this.session = await startGoogleChirpStreaming(
        this.serviceAccountJson,
        options.sampleRate,
        options.language,
      );
      console.log("[Google Chirp] Streaming session started successfully");
    } catch (error) {
      console.error("[Google Chirp] Failed to start streaming:", error);
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
    _options?: FinalizeOptions,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API - Google Chirp 3 (Streaming)",
          transcriptionMode: "api",
        },
        warnings: ["Google Chirp streaming session was not established"],
      };
    }

    try {
      console.log("[Google Chirp] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize();
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[Google Chirp] Transcript timing:", { durationMs });
      console.log("[Google Chirp] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "API - Google Chirp 3 (Streaming)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Google Chirp] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API - Google Chirp 3 (Streaming)",
          transcriptionMode: "api",
        },
        warnings: [
          `Google Chirp finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  cleanup(): void {
    if (this.session) {
      this.session.cleanup();
      this.session = null;
    }
    invoke("cleanup_google_chirp_stream").catch((err) => {
      console.error("[Google Chirp] Cleanup command error:", err);
    });
  }
}
