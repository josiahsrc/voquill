import { listen } from "@tauri-apps/api/event";
import {
  DictionaryContext,
  FinalizeOptions,
  RecordingStartOptions,
  StopRecordingResponse,
  TextFieldContext,
  TranscriptionSession,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { getEffectiveAuth } from "../utils/auth.utils";
import { PROCESSED_TRANSCRIPTION_JSON_SCHEMA } from "../utils/prompt.utils";

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
  | { type: "config"; sampleRate: number; glossary?: string[]; language?: string }
  | { type: "audio"; samples: number[] }
  | {
      type: "finalize";
      systemPrompt?: string;
      toneTemplate?: string | null;
      language?: string;
      dictionaryContext?: DictionaryContext;
      textFieldContext?: TextFieldContext | null;
      jsonResponse?: JsonResponseSchema;
    };

type ServerResultMessage = {
  type: "result";
  text: string;
  rawText: string;
  wordsUsed: number;
  transcriptionSource: string;
  transcriptionDurationMs: number;
  llmDurationMs: number;
  totalDurationMs: number;
  postProcessPrompt: string;
};

type ServerMessage =
  | { type: "authenticated"; uid: string; wordsRemaining: number }
  | { type: "ready" }
  | { type: "transcript"; text: string; source: string; durationMs: number }
  | ServerResultMessage
  | { type: "error"; code: string; message: string };

export type VoquillFinalizeOptions = {
  systemPrompt?: string;
  toneTemplate?: string | null;
  language?: string;
  dictionaryContext?: DictionaryContext;
  textFieldContext?: TextFieldContext | null;
  jsonResponse?: JsonResponseSchema;
};

type VoquillFinalizeResult = {
  text: string;
  rawText: string;
  transcriptionSource: string;
  transcriptionDurationMs: number;
  llmDurationMs: number;
  totalDurationMs: number;
  postProcessPrompt: string;
};

type VoquillStreamingSession = {
  finalize: (options?: VoquillFinalizeOptions) => Promise<VoquillFinalizeResult>;
  cleanup: () => void;
};

const startVoquillStreaming = async (
  sampleRate: number,
  glossary?: string[],
  language?: string,
): Promise<VoquillStreamingSession> => {
  console.log("[Voquill WebSocket] Starting with sample rate:", sampleRate);
  if (glossary && glossary.length > 0) {
    console.log(`[Voquill WebSocket] Using ${glossary.length} glossary terms`);
  }

  const auth = getEffectiveAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Not authenticated. Please sign in first.");
  }

  const idToken = await currentUser.getIdToken();

  const audioQueue: number[][] = [];
  const unlisten = await listen<{ samples: number[] }>("audio_chunk", (event) => {
    const samples =
      event.payload.samples instanceof Float32Array
        ? Array.from(event.payload.samples)
        : event.payload.samples;
    audioQueue.push(samples);
  });

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let isFinalized = false;
    let isReady = false;
    let sentChunkCount = 0;
    let flushInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
      }
      unlisten();
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        ws = null;
      }
    };

    let finalizeResolver: ((result: VoquillFinalizeResult) => void) | null =
      null;
    let finalizeRejecter: ((error: Error) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const send = (message: ClientMessage) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    const finalize = (
      options?: VoquillFinalizeOptions,
    ): Promise<VoquillFinalizeResult> => {
      return new Promise((resolveFinalize, rejectFinalize) => {
        console.log(
          "[Voquill WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "isReady:",
          isReady,
        );

        if (isFinalized) {
          resolveFinalize({
            text: "",
            rawText: "",
            transcriptionSource: "unknown",
            transcriptionDurationMs: 0,
            llmDurationMs: 0,
            totalDurationMs: 0,
            postProcessPrompt: "",
          });
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
            toneTemplate: options?.toneTemplate,
            language: options?.language,
            dictionaryContext: options?.dictionaryContext,
            textFieldContext: options?.textFieldContext,
            jsonResponse: options?.jsonResponse,
          });

          finalizeTimeout = setTimeout(() => {
            console.log("[Voquill WebSocket] Timeout waiting for result");
            cleanup();
            if (finalizeResolver) {
              finalizeResolver({
                text: "",
                rawText: "",
                transcriptionSource: "timeout",
                transcriptionDurationMs: 0,
                llmDurationMs: 0,
                totalDurationMs: 30000,
                postProcessPrompt: "",
              });
              finalizeResolver = null;
            }
          }, 30000);
        } else {
          console.log(
            "[Voquill WebSocket] Not ready, will finalize when ready",
          );
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
          send({ type: "config", sampleRate, glossary, language });
          break;

        case "ready":
          console.log(
            "[Voquill WebSocket] Session ready, flushing queued audio...",
          );
          isReady = true;

          const flushQueue = () => {
            while (audioQueue.length > 0) {
              const samples = audioQueue.shift()!;
              if (ws && ws.readyState === WebSocket.OPEN && !isFinalized) {
                send({ type: "audio", samples });
                sentChunkCount++;
                if (sentChunkCount <= 3 || sentChunkCount % 10 === 0) {
                  console.log(
                    `[Voquill WebSocket] Sent chunk #${sentChunkCount} (${samples.length} samples)`,
                  );
                }
              }
            }
          };

          flushQueue();
          console.log(
            `[Voquill WebSocket] Flushed ${sentChunkCount} queued chunks`,
          );

          flushInterval = setInterval(() => {
            if (isFinalized) {
              clearInterval(flushInterval!);
              flushInterval = null;
              return;
            }
            flushQueue();
          }, 50);

          resolve({ finalize, cleanup });
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
            rawTextLength: message.rawText.length,
            transcriptionSource: message.transcriptionSource,
            transcriptionDurationMs: message.transcriptionDurationMs,
            llmDurationMs: message.llmDurationMs,
            totalDurationMs: message.totalDurationMs,
          });

          if (finalizeTimeout) {
            clearTimeout(finalizeTimeout);
            finalizeTimeout = null;
          }

          cleanup();

          if (finalizeResolver) {
            finalizeResolver({
              text: message.text,
              rawText: message.rawText,
              transcriptionSource: message.transcriptionSource,
              transcriptionDurationMs: message.transcriptionDurationMs,
              llmDurationMs: message.llmDurationMs,
              totalDurationMs: message.totalDurationMs,
              postProcessPrompt: message.postProcessPrompt,
            });
            finalizeResolver = null;
          }
          break;

        case "error":
          console.error(
            "[Voquill WebSocket] Server error:",
            message.code,
            message.message,
          );

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
        finalizeResolver({
          text: "",
          rawText: "",
          transcriptionSource: "closed",
          transcriptionDurationMs: 0,
          llmDurationMs: 0,
          totalDurationMs: 0,
          postProcessPrompt: "",
        });
        finalizeResolver = null;
      }
    };
  });
};

export class VoquillTranscriptionSession implements TranscriptionSession {
  private session: VoquillStreamingSession | null = null;

  async onRecordingStart(options: RecordingStartOptions): Promise<void> {
    try {
      console.log("[Voquill] Starting streaming session...");
      this.session = await startVoquillStreaming(
        options.sampleRate,
        options.glossary,
        options.language,
      );
      console.log("[Voquill] Streaming session started successfully");
    } catch (error) {
      console.error("[Voquill] Failed to start streaming:", error);
      throw error;
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
    options?: FinalizeOptions,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        transcript: null,
        metadata: {
          inferenceDevice: "Voquill Cloud (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: ["Voquill streaming session was not established"],
      };
    }

    try {
      console.log("[Voquill] Finalizing streaming session...");

      const result = await this.session.finalize({
        systemPrompt: options?.systemPrompt,
        toneTemplate: options?.toneTemplate,
        language: options?.language,
        dictionaryContext: options?.dictionaryContext,
        textFieldContext: options?.textFieldContext,
        jsonResponse: {
          name: "transcription_cleaning",
          description: "JSON response with the processed transcription",
          schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
        },
      });

      console.log("[Voquill] Result:", {
        textLength: result.text?.length ?? 0,
        rawTextLength: result.rawText?.length ?? 0,
        transcriptionSource: result.transcriptionSource,
        transcriptionDurationMs: result.transcriptionDurationMs,
        llmDurationMs: result.llmDurationMs,
        totalDurationMs: result.totalDurationMs,
      });

      return {
        rawTranscript: result.rawText || null,
        transcript: result.text || null,
        metadata: {
          inferenceDevice: "Voquill Cloud",
          transcriptionMode: "cloud",
          transcriptionDurationMs: result.transcriptionDurationMs,
        },
        postProcessMetadata: {
          postProcessMode: "cloud",
          postProcessDevice: "Voquill Cloud",
          postprocessDurationMs: result.llmDurationMs,
          postProcessPrompt: result.postProcessPrompt,
        },
        warnings: [],
      };
    } catch (error) {
      console.error("[Voquill] Failed to finalize session:", error);
      return {
        rawTranscript: null,
        transcript: null,
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
