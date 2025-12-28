import { convertFloat32ToPCM16 } from "@repo/voice-ai";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";

type AssemblyAIStreamingSession = {
  finalize: () => Promise<string>;
  cleanup: () => void;
};

const startAssemblyAIStreaming = async (
  apiKey: string,
  sampleRate: number,
): Promise<AssemblyAIStreamingSession> => {
  console.log("[AssemblyAI WebSocket] Starting with sample rate:", sampleRate);
  const MIN_CHUNK_DURATION_MS = 50;
  const MAX_CHUNK_DURATION_MS = 950;
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
    let isFinalized = false;
    let receivedChunkCount = 0;
    let sentChunkCount = 0;
    let pendingSampleCount = 0;
    let pendingChunks: Float32Array[] = [];

    let currentTurn = 0;
    let extra = "";

    const getText = () => {
      return (
        finalTranscript + (extra ? (finalTranscript ? " " : "") + extra : "")
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
              `[AssemblyAI WebSocket] Sent chunk #${sentChunkCount} (${chunk.length} samples ~${durationMs.toFixed(1)} ms, ${pcm16.byteLength} bytes)`,
            );
          }
        } catch (error) {
          console.error(
            "[AssemblyAI WebSocket] Error sending buffered chunk:",
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

    const finalize = (): Promise<string> => {
      return new Promise((resolveFinalize) => {
        // resolveFinalize(finalTranscript);
        console.log(
          "[AssemblyAI WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "ws state:",
          ws?.readyState,
        );
        if (isFinalized) {
          console.log(
            "[AssemblyAI WebSocket] Already finalized, returning transcript",
          );
          resolveFinalize(getText());
          return;
        }

        isFinalized = true;
        flushPendingSamples(true);
        console.log(
          "[AssemblyAI WebSocket] Total chunks sent:",
          sentChunkCount,
        );

        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("[AssemblyAI WebSocket] Sending Terminate message...");
          // Send termination message
          ws.send(JSON.stringify({ type: "Terminate" }));

          // Wait a bit for final transcript
          const timeout = setTimeout(() => {
            console.log(
              "[AssemblyAI WebSocket] Timeout reached, finalizing with transcript:",
              getText(),
            );
            cleanup();
            resolveFinalize(getText());
          }, 2000);

          // Override onclose to resolve when WebSocket closes
          const originalOnClose = ws.onclose;
          const currentWs = ws;
          ws.onclose = () => {
            clearTimeout(timeout);
            if (originalOnClose && currentWs)
              originalOnClose.call(currentWs, {} as CloseEvent);
            cleanup();
            console.log(
              "[AssemblyAI WebSocket] WebSocket closed, finalizing with transcript:",
              getText(),
            );
            resolveFinalize(getText());
          };
        } else {
          cleanup();
          resolveFinalize(finalTranscript);
        }
      });
    };

    // Open WebSocket
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${sampleRate}&token=${apiKey}`;
    console.log("[AssemblyAI WebSocket] Connecting to:", wsUrl, apiKey);
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log("[AssemblyAI WebSocket] Connected, sending auth...");
      console.log(
        "[AssemblyAI WebSocket] API Key present:",
        !!apiKey,
        "length:",
        apiKey?.length ?? 0,
      );
      console.log(
        "[AssemblyAI WebSocket] API Key preview:",
        apiKey?.substring(0, 10) + "...",
      );
      // Send auth via first message

      // Listen for audio chunks from Rust
      try {
        console.log(
          "[AssemblyAI WebSocket] Setting up audio_chunk listener...",
        );
        unlisten = await listen<{ samples: number[] }>(
          "audio_chunk",
          (event) => {
            receivedChunkCount++;
            if (receivedChunkCount <= 3 || receivedChunkCount % 10 === 0) {
              console.log(
                `[AssemblyAI WebSocket] Received chunk #${receivedChunkCount}, samples:`,
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
                  "[AssemblyAI WebSocket] Error sending audio chunk:",
                  error,
                );
              }
            }
          },
        );

        console.log("[AssemblyAI WebSocket] Session ready, listener attached");
        // Session is ready
        resolve({ finalize, cleanup });
      } catch (error) {
        console.error(
          "[AssemblyAI WebSocket] Error setting up listener:",
          error,
        );
        cleanup();
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(
          "[AssemblyAI WebSocket] Received message:",
          data.type,
          data,
        );

        if (data.type === "Turn" && data.end_of_turn) {
          // Final formatted transcript
          finalTranscript +=
            (finalTranscript ? " " : "") + (data.transcript || "");
          console.log(
            "[AssemblyAI WebSocket] Final formatted transcript received:",
            finalTranscript.substring(0, 100),
          );
          if (currentTurn === data.turn_order) {
            extra = "";
          }
        } else if (data.type === "Turn") {
          if (currentTurn != data.turn_order) {
            currentTurn = data.turn_order;

            extra = data.transcript;
          }
        }
      } catch (error) {
        console.error("[AssemblyAI WebSocket] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[AssemblyAI WebSocket] WebSocket error:", error);
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[AssemblyAI WebSocket] WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });
      cleanup();
    };
  });
};

export class AssemblyAITranscriptionSession implements TranscriptionSession {
  private session: AssemblyAIStreamingSession | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[AssemblyAI] Starting streaming session...");
      this.session = await startAssemblyAIStreaming(this.apiKey, sampleRate);
      console.log("[AssemblyAI] Streaming session started successfully");
    } catch (error) {
      console.error("[AssemblyAI] Failed to start streaming:", error);
      // Continue recording anyway - finalize will handle missing session
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • AssemblyAI (Streaming)",
          transcriptionMode: "api",
        },
        warnings: ["AssemblyAI streaming session was not established"],
      };
    }

    try {
      console.log("[AssemblyAI] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize();
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[AssemblyAI] Transcript timing:", { durationMs });
      console.log("[AssemblyAI] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "API • AssemblyAI (Streaming)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[AssemblyAI] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • AssemblyAI (Streaming)",
          transcriptionMode: "api",
        },
        warnings: [
          `AssemblyAI finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
