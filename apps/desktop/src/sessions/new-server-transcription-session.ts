import { listen } from "@tauri-apps/api/event";
import { getAppState } from "../store";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionFinalizeOptions,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { getEffectiveAuth } from "../utils/auth.utils";
import { getLogger } from "../utils/log.utils";
import { NEW_SERVER_URL } from "../utils/new-server.utils";
import { collectDictionaryEntries } from "../utils/prompt.utils";
import { loadMyEffectiveDictationLanguage } from "../utils/user.utils";

type TranscriptResult = {
  text: string;
  source: string;
  durationMs?: number;
};

type NewServerStreamingSession = {
  finalize: () => Promise<TranscriptResult>;
  cleanup: () => void;
};

const startNewServerStreaming = async (
  sampleRate: number,
  glossary: string[],
  language?: string,
): Promise<NewServerStreamingSession> => {
  console.log("[NewServer WebSocket] Starting with sample rate:", sampleRate);

  let ws: WebSocket | null = null;
  let isFinalized = false;
  let isReady = false;
  let sentChunkCount = 0;
  const bufferedChunks: Float32Array[] = [];

  const unlisten = await listen<{ samples: number[] }>(
    "audio_chunk",
    (event) => {
      if (isFinalized) {
        return;
      }

      const samples = new Float32Array(event.payload.samples);

      if (!isReady) {
        bufferedChunks.push(samples);
        if (bufferedChunks.length <= 3 || bufferedChunks.length % 10 === 0) {
          console.log(
            `[NewServer WebSocket] Buffered chunk #${bufferedChunks.length} (${samples.length} samples)`,
          );
        }
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(samples.buffer);
          sentChunkCount++;
          if (sentChunkCount <= 3 || sentChunkCount % 10 === 0) {
            console.log(
              `[NewServer WebSocket] Sent chunk #${sentChunkCount} (${samples.length} samples)`,
            );
          }
        } catch (error) {
          console.error(
            "[NewServer WebSocket] Error sending audio chunk:",
            error,
          );
        }
      }
    },
  );

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (finalizeTimeout) {
        clearTimeout(finalizeTimeout);
        finalizeTimeout = null;
      }
      unlisten();
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        ws = null;
      }
    };

    let finalizeResolver: ((result: TranscriptResult) => void) | null = null;
    let finalizeRejecter: ((error: Error) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalize = (): Promise<TranscriptResult> => {
      return new Promise((resolveFinalize, rejectFinalize) => {
        console.log(
          "[NewServer WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "ws state:",
          ws?.readyState,
        );

        if (isFinalized) {
          resolveFinalize({ text: "", source: "" });
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;
        finalizeRejecter = rejectFinalize;

        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("[NewServer WebSocket] Sending finalize message...");
          ws.send(JSON.stringify({ type: "finalize" }));

          finalizeTimeout = setTimeout(() => {
            console.log("[NewServer WebSocket] Timeout reached");
            cleanup();
            if (finalizeRejecter) {
              finalizeRejecter(
                new Error("Server did not respond within 15 seconds"),
              );
              finalizeRejecter = null;
              finalizeResolver = null;
            }
          }, 15000);
        } else {
          cleanup();
          resolveFinalize({ text: "", source: "" });
        }
      });
    };

    const wsUrl = NEW_SERVER_URL.replace(/^http/, "ws") + "/v1/transcribe-raw";
    console.log("[NewServer WebSocket] Connecting to:", wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log("[NewServer WebSocket] Connected, authenticating...");

      try {
        const auth = getEffectiveAuth();
        const user = auth.currentUser;
        if (!user) {
          reject(new Error("Not authenticated"));
          cleanup();
          return;
        }
        const idToken = await user.getIdToken();
        ws!.send(JSON.stringify({ type: "auth", idToken }));
      } catch (err) {
        reject(err);
        cleanup();
      }
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[NewServer WebSocket] Received:", msg.type);

        if (msg.type === "error") {
          const error = new Error(`${msg.code}: ${msg.message}`);
          if (finalizeRejecter) {
            finalizeRejecter(error);
            finalizeRejecter = null;
            finalizeResolver = null;
          } else {
            reject(error);
          }
          cleanup();
          return;
        }

        if (msg.type === "authenticated") {
          console.log(
            "[NewServer WebSocket] Authenticated, words remaining:",
            msg.wordsRemaining,
          );
          ws!.send(
            JSON.stringify({
              type: "config",
              sampleRate,
              glossary,
              language,
            }),
          );
          return;
        }

        if (msg.type === "ready") {
          console.log(
            `[NewServer WebSocket] Ready, flushing ${bufferedChunks.length} buffered chunks`,
          );
          isReady = true;

          for (const samples of bufferedChunks) {
            if (ws && ws.readyState === WebSocket.OPEN && !isFinalized) {
              try {
                ws.send(samples.buffer);
                sentChunkCount++;
              } catch (error) {
                console.error(
                  "[NewServer WebSocket] Error sending buffered chunk:",
                  error,
                );
              }
            }
          }
          bufferedChunks.length = 0;
          console.log(
            `[NewServer WebSocket] Flushed ${sentChunkCount} chunks, session ready`,
          );

          resolve({ finalize, cleanup });
          return;
        }

        if (msg.type === "transcript") {
          console.log(
            "[NewServer WebSocket] Transcript received, length:",
            msg.text?.length ?? 0,
            "source:",
            msg.source,
          );
          if (finalizeTimeout) {
            clearTimeout(finalizeTimeout);
            finalizeTimeout = null;
          }
          cleanup();
          if (finalizeResolver) {
            finalizeResolver({
              text: msg.text || "",
              source: msg.source || "",
              durationMs: msg.durationMs,
            });
            finalizeResolver = null;
          }
          return;
        }
      } catch (err) {
        console.error("[NewServer WebSocket] Error parsing message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("[NewServer WebSocket] WebSocket error:", error);
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[NewServer WebSocket] WebSocket closed:", {
        code: event.code,
        reason: event.reason,
      });
      if (finalizeRejecter) {
        finalizeRejecter(new Error("Connection closed unexpectedly"));
        finalizeRejecter = null;
        finalizeResolver = null;
      } else if (!isReady) {
        reject(new Error("Connection closed before ready"));
      }
    };
  });
};

export class NewServerTranscriptionSession implements TranscriptionSession {
  private session: NewServerStreamingSession | null = null;
  private startError: Error | null = null;

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      getLogger().info("[NewServer] Starting streaming session...");

      const state = getAppState();
      const entries = collectDictionaryEntries(state);
      const language = await loadMyEffectiveDictationLanguage(state);
      this.session = await startNewServerStreaming(
        sampleRate,
        entries.sources,
        language,
      );

      getLogger().info("[NewServer] Streaming session started successfully");
    } catch (error) {
      getLogger().error("[NewServer] Failed to start streaming:", error);
      this.startError =
        error instanceof Error ? error : new Error(String(error));
      throw new Error(
        "Unable to connect to the server. Please check your internet connection or try signing in again.",
      );
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
    _options?: TranscriptionSessionFinalizeOptions,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      const reason = this.startError
        ? `New server connection failed: ${this.startError.message}`
        : "New server streaming session was not established";
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "Cloud • New Server (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: [reason],
      };
    }

    try {
      getLogger().info("[NewServer] Finalizing streaming session...");
      const result = await this.session.finalize();
      getLogger().info("[NewServer] Transcript received:", {
        length: result.text?.length ?? 0,
        source: result.source,
        durationMs: result.durationMs,
      });

      return {
        rawTranscript: result.text || null,
        metadata: {
          inferenceDevice: `Cloud • ${result.source || "New Server"}`,
          transcriptionMode: "cloud",
          transcriptionDurationMs: result.durationMs ?? null,
        },
        warnings: [],
      };
    } catch (error) {
      getLogger().error("[NewServer] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "Cloud • New Server (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: [
          `New server finalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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

  supportsStreaming(): boolean {
    return false;
  }

  setInterimResultCallback(): void {}
}
