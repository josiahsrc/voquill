import { convertFloat32ToBase64PCM16 } from "@repo/voice-ai";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";

type OpenAIStreamingSession = {
  finalize: () => Promise<string>;
  cleanup: () => void;
};

const TARGET_SAMPLE_RATE = 24000;

const resampleLinear = (
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array => {
  if (fromRate === toRate) {
    return input;
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.ceil(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const frac = srcIndex - srcFloor;

    if (srcFloor + 1 < input.length) {
      output[i] = input[srcFloor]! * (1 - frac) + input[srcFloor + 1]! * frac;
    } else {
      output[i] = input[Math.min(srcFloor, input.length - 1)]!;
    }
  }

  return output;
};

const startOpenAIStreaming = async (
  apiKey: string,
  model: string,
  inputSampleRate: number,
): Promise<OpenAIStreamingSession> => {
  console.log(
    "[OpenAI WebSocket] Starting with input sample rate:",
    inputSampleRate,
    "target:",
    TARGET_SAMPLE_RATE,
  );

  const needsResample = inputSampleRate !== TARGET_SAMPLE_RATE;
  const MIN_CHUNK_DURATION_MS = 20;
  const MAX_CHUNK_DURATION_MS = 100;
  const minSamplesPerChunk = Math.max(
    1,
    Math.ceil((TARGET_SAMPLE_RATE * MIN_CHUNK_DURATION_MS) / 1000),
  );
  const maxSamplesPerChunk = Math.max(
    minSamplesPerChunk,
    Math.ceil((TARGET_SAMPLE_RATE * MAX_CHUNK_DURATION_MS) / 1000),
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

    const sendAudioChunk = (chunk: Float32Array) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const base64Audio = convertFloat32ToBase64PCM16(chunk);
        const message = JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64Audio,
        });
        ws.send(message);
        sentChunkCount++;
        if (sentChunkCount <= 3 || sentChunkCount % 10 === 0) {
          const durationMs = (chunk.length / TARGET_SAMPLE_RATE) * 1000;
          console.log(
            `[OpenAI WebSocket] Sent chunk #${sentChunkCount} (${chunk.length} samples ~${durationMs.toFixed(1)} ms)`,
          );
        }
      } catch (error) {
        console.error("[OpenAI WebSocket] Error sending chunk:", error);
      }
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

        sendAudioChunk(chunk);
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
          "[OpenAI WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "ws state:",
          ws?.readyState,
        );
        if (isFinalized) {
          console.log(
            "[OpenAI WebSocket] Already finalized, returning transcript",
          );
          resolveFinalize(getText());
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;

        flushPendingSamples(true);
        console.log(
          "[OpenAI WebSocket] Total chunks sent:",
          sentChunkCount,
          "- committing buffer and waiting for final transcript...",
        );

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
          ws.send(JSON.stringify({ type: "response.create" }));

          finalizeTimeout = setTimeout(() => {
            console.log(
              "[OpenAI WebSocket] Timeout waiting for final transcript:",
              getText(),
            );
            cleanup();
            if (finalizeResolver) {
              finalizeResolver(getText());
              finalizeResolver = null;
            }
          }, 6000);
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
          "[OpenAI WebSocket] Completing finalize with transcript:",
          getText(),
        );
        cleanup();
        finalizeResolver(getText());
        finalizeResolver = null;
      }
    };

    const wsUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    console.log("[OpenAI WebSocket] Connecting to:", wsUrl);
    ws = new WebSocket(wsUrl, [
      "realtime",
      `openai-insecure-api-key.${apiKey}`,
      "openai-beta.realtime-v1",
    ]);

    ws.onopen = async () => {
      console.log("[OpenAI WebSocket] Connected");

      try {
        ws!.send(
          JSON.stringify({
            type: "session.update",
            session: {
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: model,
              },
              turn_detection: {
                type: "server_vad",
              },
            },
          }),
        );

        console.log(
          "[OpenAI WebSocket] Setting up audio_chunk listener...",
        );
        unlisten = await listen<{ samples: number[] }>(
          "audio_chunk",
          (event) => {
            receivedChunkCount++;
            if (receivedChunkCount <= 3 || receivedChunkCount % 10 === 0) {
              console.log(
                `[OpenAI WebSocket] Received chunk #${receivedChunkCount}, samples:`,
                event.payload.samples.length,
              );
            }
            if (ws && ws.readyState === WebSocket.OPEN && !isFinalized) {
              try {
                let typedChunk =
                  event.payload.samples instanceof Float32Array
                    ? event.payload.samples
                    : Float32Array.from(event.payload.samples);

                if (needsResample) {
                  typedChunk = resampleLinear(
                    typedChunk,
                    inputSampleRate,
                    TARGET_SAMPLE_RATE,
                  );
                }

                pendingChunks.push(typedChunk);
                pendingSampleCount += typedChunk.length;
                flushPendingSamples(false);
              } catch (error) {
                console.error(
                  "[OpenAI WebSocket] Error sending audio chunk:",
                  error,
                );
              }
            }
          },
        );

        console.log("[OpenAI WebSocket] Session ready, listener attached");
        resolve({ finalize, cleanup });
      } catch (error) {
        console.error(
          "[OpenAI WebSocket] Error setting up listener:",
          error,
        );
        cleanup();
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type;

        if (
          messageType ===
          "conversation.item.input_audio_transcription.completed"
        ) {
          const transcript = data.transcript || "";
          if (transcript) {
            finalTranscript +=
              (finalTranscript ? " " : "") + transcript;
            partialTranscript = "";
            console.log(
              "[OpenAI WebSocket] Completed transcript:",
              finalTranscript.substring(0, 100),
            );
            if (isFinalized) {
              completeFinalize();
            }
          }
        } else if (
          messageType ===
          "conversation.item.input_audio_transcription.delta"
        ) {
          partialTranscript = data.delta || "";
        } else if (messageType === "session.created") {
          console.log("[OpenAI WebSocket] Session created:", data);
        } else if (messageType === "session.updated") {
          console.log("[OpenAI WebSocket] Session updated:", data);
        } else if (messageType === "error") {
          console.error("[OpenAI WebSocket] Error from server:", data);
        }
      } catch (error) {
        console.error("[OpenAI WebSocket] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[OpenAI WebSocket] WebSocket error:", error);
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[OpenAI WebSocket] WebSocket closed:", {
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

export class OpenAIStreamingTranscriptionSession
  implements TranscriptionSession
{
  private session: OpenAIStreamingSession | null = null;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[OpenAI] Starting streaming session...");
      this.session = await startOpenAIStreaming(
        this.apiKey,
        this.model,
        sampleRate,
      );
      console.log("[OpenAI] Streaming session started successfully");
    } catch (error) {
      console.error("[OpenAI] Failed to start streaming:", error);
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • OpenAI (Streaming)",
          transcriptionMode: "api",
        },
        warnings: ["OpenAI streaming session was not established"],
      };
    }

    try {
      console.log("[OpenAI] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize();
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[OpenAI] Transcript timing:", { durationMs });
      console.log("[OpenAI] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "API • OpenAI (Streaming)",
          transcriptionMode: "api",
          transcriptionDurationMs: durationMs,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[OpenAI] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "API • OpenAI (Streaming)",
          transcriptionMode: "api",
        },
        warnings: [
          `OpenAI finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
