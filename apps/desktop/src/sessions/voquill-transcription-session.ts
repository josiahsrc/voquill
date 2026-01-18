import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { getEffectiveAuth } from "../utils/auth.utils";

const WEBSOCKET_SERVER_URL =
  import.meta.env.VITE_VOQUILL_SERVER_URL ??
  "wss://voquill-server-6bep2yuvca-uc.a.run.app";

type JsonResponseSchema = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};

type ClientMessage =
  | { type: "auth"; idToken: string }
  | { type: "config"; sampleRate: number }
  | { type: "audio"; samples: number[] }
  | {
      type: "finalize";
      systemPrompt?: string;
      userPrompt?: string;
      jsonResponse?: JsonResponseSchema;
    };

type ServerMessage =
  | { type: "authenticated"; uid: string; wordsRemaining: number }
  | { type: "ready" }
  | { type: "transcript"; text: string; source: string; durationMs: number }
  | { type: "result"; text: string; rawText: string; wordsUsed: number }
  | { type: "error"; code: string; message: string };

export type VoquillFinalizeOptions = {
  systemPrompt?: string;
  userPrompt?: string;
  jsonResponse?: JsonResponseSchema;
};

type VoquillStreamingSession = {
  finalize: (options?: VoquillFinalizeOptions) => Promise<string>;
  cleanup: () => void;
};

const startVoquillStreaming = async (
  sampleRate: number,
): Promise<VoquillStreamingSession> => {
  console.log("[Voquill WebSocket] Starting with sample rate:", sampleRate);

  const auth = getEffectiveAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Not authenticated. Please sign in first.");
  }

  const idToken = await currentUser.getIdToken();

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let unlisten: UnlistenFn | null = null;
    let isFinalized = false;
    let isReady = false;
    let sentChunkCount = 0;
    let receivedChunkCount = 0;

    const cleanup = () => {
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        ws = null;
      }
    };

    let finalizeResolver: ((text: string) => void) | null = null;
    let finalizeRejecter: ((error: Error) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const send = (message: ClientMessage) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    const finalize = (options?: VoquillFinalizeOptions): Promise<string> => {
      return new Promise((resolveFinalize, rejectFinalize) => {
        console.log(
          "[Voquill WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "isReady:",
          isReady,
        );

        if (isFinalized) {
          resolveFinalize("");
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;
        finalizeRejecter = rejectFinalize;

        if (isReady && ws && ws.readyState === WebSocket.OPEN) {
          console.log("[Voquill WebSocket] Sending finalize message...");
          send({
            type: "finalize",
            systemPrompt: options?.systemPrompt,
            userPrompt: options?.userPrompt,
            jsonResponse: options?.jsonResponse,
          });

          finalizeTimeout = setTimeout(() => {
            console.log("[Voquill WebSocket] Timeout waiting for result");
            cleanup();
            if (finalizeResolver) {
              finalizeResolver("");
              finalizeResolver = null;
            }
          }, 30000);
        } else {
          console.log("[Voquill WebSocket] Not ready, will finalize when ready");
        }
      });
    };

    console.log("[Voquill WebSocket] Connecting to:", WEBSOCKET_SERVER_URL);
    ws = new WebSocket(WEBSOCKET_SERVER_URL);

    ws.onopen = () => {
      console.log("[Voquill WebSocket] Connected, authenticating...");
      send({ type: "auth", idToken });
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      switch (message.type) {
        case "authenticated":
          console.log("[Voquill WebSocket] Authenticated:", message.uid);
          send({ type: "config", sampleRate });
          break;

        case "ready":
          console.log("[Voquill WebSocket] Session ready, setting up audio listener...");
          isReady = true;

          try {
            unlisten = await listen<{ samples: number[] }>(
              "audio_chunk",
              (event) => {
                receivedChunkCount++;
                if (receivedChunkCount <= 3 || receivedChunkCount % 10 === 0) {
                  console.log(
                    `[Voquill WebSocket] Received chunk #${receivedChunkCount}, samples:`,
                    event.payload.samples.length,
                  );
                }

                if (ws && ws.readyState === WebSocket.OPEN && !isFinalized) {
                  const samples = event.payload.samples instanceof Float32Array
                    ? Array.from(event.payload.samples)
                    : event.payload.samples;

                  send({ type: "audio", samples });
                  sentChunkCount++;

                  if (sentChunkCount <= 3 || sentChunkCount % 10 === 0) {
                    console.log(
                      `[Voquill WebSocket] Sent chunk #${sentChunkCount}`,
                    );
                  }
                }
              },
            );

            console.log("[Voquill WebSocket] Audio listener attached");
            resolve({ finalize, cleanup });
          } catch (error) {
            console.error("[Voquill WebSocket] Error setting up listener:", error);
            cleanup();
            reject(error);
          }
          break;

        case "transcript":
          console.log(
            `[Voquill WebSocket] Intermediate transcript from ${message.source} (${message.durationMs}ms):`,
            message.text.substring(0, 50),
          );
          break;

        case "result":
          console.log("[Voquill WebSocket] Final result received:", {
            textLength: message.text.length,
            wordsUsed: message.wordsUsed,
          });

          if (finalizeTimeout) {
            clearTimeout(finalizeTimeout);
            finalizeTimeout = null;
          }

          cleanup();

          if (finalizeResolver) {
            finalizeResolver(message.text);
            finalizeResolver = null;
          }
          break;

        case "error":
          console.error("[Voquill WebSocket] Server error:", message.code, message.message);

          if (finalizeTimeout) {
            clearTimeout(finalizeTimeout);
            finalizeTimeout = null;
          }

          cleanup();

          if (finalizeRejecter) {
            finalizeRejecter(new Error(`${message.code}: ${message.message}`));
            finalizeRejecter = null;
          } else {
            reject(new Error(`${message.code}: ${message.message}`));
          }
          break;
      }
    };

    ws.onerror = (error) => {
      console.error("[Voquill WebSocket] WebSocket error:", error);
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[Voquill WebSocket] WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });

      if (finalizeResolver) {
        finalizeResolver("");
        finalizeResolver = null;
      }
    };
  });
};

export class VoquillTranscriptionSession implements TranscriptionSession {
  private session: VoquillStreamingSession | null = null;
  private options?: VoquillFinalizeOptions;

  constructor(options?: VoquillFinalizeOptions) {
    this.options = options;
  }

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[Voquill] Starting streaming session...");
      this.session = await startVoquillStreaming(sampleRate);
      console.log("[Voquill] Streaming session started successfully");
    } catch (error) {
      console.error("[Voquill] Failed to start streaming:", error);
      throw error;
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "Voquill Cloud (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: ["Voquill streaming session was not established"],
      };
    }

    try {
      console.log("[Voquill] Finalizing streaming session...");
      const finalizeStart = performance.now();
      const transcript = await this.session.finalize(this.options);
      const durationMs = Math.round(performance.now() - finalizeStart);

      console.log("[Voquill] Transcript timing:", { durationMs });
      console.log("[Voquill] Received transcript:", {
        length: transcript?.length ?? 0,
        preview:
          transcript?.substring(0, 50) +
          (transcript && transcript.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: transcript || null,
        metadata: {
          inferenceDevice: "Voquill Cloud (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Voquill] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "Voquill Cloud (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: [
          `Voquill finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
