import { convertFloat32ToPCM16 } from "@repo/voice-ai";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  FinalizeOptions,
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";

type DeepgramStreamingSession = {
  finalize: () => Promise<string>;
  cleanup: () => void;
};

const startDeepgramStreaming = async (
  apiKey: string,
  sampleRate: number,
): Promise<DeepgramStreamingSession> => {
  console.log("[Deepgram WebSocket] Starting with sample rate:", sampleRate);
  const MIN_CHUNK_DURATION_MS = 20;
  const MAX_CHUNK_DURATION_MS = 100;
  const minSamplesPerChunk = Math.max(
    1,
    Math.ceil((sampleRate * MIN_CHUNK_DURATION_MS) / 1000),
  );
  const maxSamplesPerChunk = Math.max(
    minSamplesPerChunk,
    Math.ceil((sampleRate * MAX_CHUNK_DURATION_MS) / 1000),
  );
  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let unlisten: UnlistenFn | null = null;
    let finalTranscript = "";
    let partialTranscript = "";
    let isFinalized = false;
    let receivedChunkCount = 0;
    let sentChunkCount = 0;
    let pendingSampleCount = 0;
    let pendingChunks: Float32Array[] = [];

    const getText = () => {
      return (
        finalTranscript +
        (partialTranscript
          ? (finalTranscript ? " " : "") + partialTranscript
          : "")
      );
    };

    const resetBuffers = () => {
      pendingChunks = [];
      pendingSampleCount = 0;
    };

    const drainSamples = (targetCount: number): Float32Array => {
      if (targetCount <= 0) {
        return new Float32Array(0);
      }
      const output = new Float32Array(targetCount);
      let filled = 0;

      while (filled < targetCount && pendingChunks.length > 0) {
        const current = pendingChunks[0];
        const remaining = targetCount - filled;
        if (current.length <= remaining) {
          output.set(current, filled);
          filled += current.length;
          pendingChunks.shift();
        } else {
          output.set(current.subarray(0, remaining), filled);
          pendingChunks[0] = current.subarray(remaining);
          filled += remaining;
        }
      }

      pendingSampleCount = Math.max(0, pendingSampleCount - filled);
      return filled === targetCount ? output : output.subarray(0, filled);
    };

    const flushPendingSamples = (force = false) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      while (
        pendingSampleCount >= minSamplesPerChunk ||
        (force && pendingSampleCount > 0)
      ) {
        const available = pendingSampleCount;
        let chunkSize = available;
        if (available >= maxSamplesPerChunk) {
          chunkSize = maxSamplesPerChunk;
        } else if (available < minSamplesPerChunk && !force) {
          break;
        }

        let chunk = drainSamples(chunkSize);
        if (force && chunk.length > 0 && chunk.length < minSamplesPerChunk) {
          const padded = new Float32Array(minSamplesPerChunk);
          padded.set(chunk);
          chunk = padded;
        }

        if (chunk.length === 0) {
          break;
        }

        try {
          const pcm16 = convertFloat32ToPCM16(chunk);
          ws.send(pcm16);
          sentChunkCount++;
          if (sentChunkCount <= 3 || sentChunkCount % 10 === 0) {
            const durationMs = (chunk.length / sampleRate) * 1000;
            console.log(
              `[Deepgram WebSocket] Sent chunk #${sentChunkCount} (${chunk.length} samples ~${durationMs.toFixed(1)} ms, ${pcm16.byteLength} bytes)`,
            );
          }
        } catch (error) {
          console.error(
            "[Deepgram WebSocket] Error sending buffered chunk:",
            error,
          );
          break;
        }
      }
    };

    const cleanup = () => {
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        ws = null;
      }
      resetBuffers();
    };

    let finalizeResolver: ((text: string) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalize = (): Promise<string> => {
      return new Promise((resolveFinalize) => {
        console.log(
          "[Deepgram WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "ws state:",
          ws?.readyState,
        );
        if (isFinalized) {
          console.log(
            "[Deepgram WebSocket] Already finalized, returning transcript",
          );
          resolveFinalize(getText());
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;
        flushPendingSamples(true);
        console.log("[Deepgram WebSocket] Total chunks sent:", sentChunkCount);

        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("[Deepgram WebSocket] Sending CloseStream message...");
          ws.send(JSON.stringify({ type: "CloseStream" }));

          finalizeTimeout = setTimeout(() => {
            console.log(
              "[Deepgram WebSocket] Timeout reached, finalizing with transcript:",
              getText(),
            );
            cleanup();
            if (finalizeResolver) {
              finalizeResolver(getText());
              finalizeResolver = null;
            }
          }, 3000);
        } else {
          cleanup();
          resolveFinalize(getText());
        }
      });
    };

    const completeFinalize = () => {
      if (finalizeTimeout) {
        clearTimeout(finalizeTimeout);
        finalizeTimeout = null;
      }
      if (finalizeResolver) {
        console.log(
          "[Deepgram WebSocket] Completing finalize with transcript:",
          getText(),
        );
        cleanup();
        finalizeResolver(getText());
        finalizeResolver = null;
      }
    };

    const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${sampleRate}&model=nova-3&punctuate=true&smart_format=true&interim_results=true&endpointing=300`;
    console.log("[Deepgram WebSocket] Connecting to:", wsUrl);
    ws = new WebSocket(wsUrl, ["token", apiKey]);

    ws.onopen = async () => {
      console.log("[Deepgram WebSocket] Connected");

      try {
        console.log("[Deepgram WebSocket] Setting up audio_chunk listener...");
        unlisten = await listen<{ samples: number[] }>(
          "audio_chunk",
          (event) => {
            receivedChunkCount++;
            if (receivedChunkCount <= 3 || receivedChunkCount % 10 === 0) {
              console.log(
                `[Deepgram WebSocket] Received chunk #${receivedChunkCount}, samples:`,
                event.payload.samples.length,
              );
            }
            if (ws && ws.readyState === WebSocket.OPEN && !isFinalized) {
              try {
                const typedChunk =
                  event.payload.samples instanceof Float32Array
                    ? event.payload.samples
                    : Float32Array.from(event.payload.samples);
                pendingChunks.push(typedChunk);
                pendingSampleCount += typedChunk.length;
                flushPendingSamples(false);
              } catch (error) {
                console.error(
                  "[Deepgram WebSocket] Error sending audio chunk:",
                  error,
                );
              }
            }
          },
        );

        console.log("[Deepgram WebSocket] Session ready, listener attached");
        resolve({ finalize, cleanup });
      } catch (error) {
        console.error("[Deepgram WebSocket] Error setting up listener:", error);
        cleanup();
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type;
        console.log(
          "[Deepgram WebSocket] Received message:",
          messageType,
          data,
        );

        if (messageType === "Results") {
          const transcript = data.channel?.alternatives?.[0]?.transcript || "";
          const isFinal = data.is_final === true;
          const speechFinal = data.speech_final === true;

          if (isFinal && transcript) {
            finalTranscript += (finalTranscript ? " " : "") + transcript;
            partialTranscript = "";
            console.log(
              "[Deepgram WebSocket] Final transcript received:",
              finalTranscript.substring(0, 100),
            );
            if (speechFinal && isFinalized) {
              completeFinalize();
            }
          } else if (!isFinal && transcript) {
            partialTranscript = transcript;
          }
        } else if (messageType === "Metadata") {
          console.log("[Deepgram WebSocket] Metadata received:", data);
        } else if (messageType === "Error" || data.error) {
          console.error("[Deepgram WebSocket] Error from server:", data);
        }
      } catch (error) {
        console.error("[Deepgram WebSocket] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[Deepgram WebSocket] WebSocket error:", error);
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[Deepgram WebSocket] WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });
      if (isFinalized && finalizeResolver) {
        completeFinalize();
      }
      cleanup();
    };
  });
};

export class DeepgramTranscriptionSession implements TranscriptionSession {
  private session: DeepgramStreamingSession | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[Deepgram] Starting streaming session...");
      this.session = await startDeepgramStreaming(this.apiKey, sampleRate);
      console.log("[Deepgram] Streaming session started successfully");
    } catch (error) {
      console.error("[Deepgram] Failed to start streaming:", error);
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
          inferenceDevice: "API • Deepgram (Streaming)",
          transcriptionMode: "api",
        },
        warnings: ["Deepgram streaming session was not established"],
      };
    }

    try {
      console.log("[Deepgram] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize();
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[Deepgram] Transcript timing:", { durationMs });
      console.log("[Deepgram] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "API • Deepgram (Streaming)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Deepgram] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • Deepgram (Streaming)",
          transcriptionMode: "api",
        },
        warnings: [
          `Deepgram finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  cleanup(): void {
    if (this.session) {
      this.session.cleanup();
      this.session = null;
    }
  }
}
