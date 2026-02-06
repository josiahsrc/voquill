import { Nullable } from "@repo/types";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { getAppState } from "../store";
import { TextFieldInfo } from "../types/accessibility.types";
import {
  StopRecordingResponse,
  TranscriptionSession,
  TranscriptionSessionFinalizeOptions,
  TranscriptionSessionResult,
} from "../types/transcription-session.types";
import { extractTextFieldContext } from "../utils/accessibility.utils";
import { getEffectiveAuth } from "../utils/auth.utils";
import { NEW_SERVER_URL } from "../utils/new-server.utils";
import {
  buildLocalizedPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  collectDictionaryEntries,
} from "../utils/prompt.utils";
import { getToneTemplateWithFallback } from "../utils/tone.utils";
import {
  getMyUser,
  loadMyEffectiveDictationLanguage,
} from "../utils/user.utils";

type ProcessMessage = {
  role: "system" | "user";
  content: string;
};

type TranscriptResult = {
  text: string;
  durationMs?: number;
  processed?: {
    text: string;
    wordsUsed: number;
    tokensUsed: number;
    durationMs?: number;
  };
};

type NewServerStreamingSession = {
  finalize: (prompt?: ProcessMessage[]) => Promise<TranscriptResult>;
  cleanup: () => void;
};

const startNewServerStreaming = async (
  sampleRate: number,
  glossary: string[],
  language?: string,
): Promise<NewServerStreamingSession> => {
  console.log("[NewServer WebSocket] Starting with sample rate:", sampleRate);

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let unlisten: UnlistenFn | null = null;
    let isFinalized = false;
    let isReady = false;
    let receivedChunkCount = 0;
    let sentChunkCount = 0;

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

    let finalizeResolver: ((result: TranscriptResult) => void) | null = null;
    let finalizeRejecter: ((error: Error) => void) | null = null;
    let finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalize = (prompt?: ProcessMessage[]): Promise<TranscriptResult> => {
      return new Promise((resolveFinalize, rejectFinalize) => {
        console.log(
          "[NewServer WebSocket] Finalize called, isFinalized:",
          isFinalized,
          "ws state:",
          ws?.readyState,
          "with prompt:",
          !!prompt,
        );

        if (isFinalized) {
          resolveFinalize({ text: "" });
          return;
        }

        isFinalized = true;
        finalizeResolver = resolveFinalize;
        finalizeRejecter = rejectFinalize;

        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("[NewServer WebSocket] Sending finalize message...");
          const message: { type: string; prompt?: ProcessMessage[] } = {
            type: "finalize",
          };
          if (prompt && prompt.length > 0) {
            message.prompt = prompt;
          }
          ws.send(JSON.stringify(message));

          finalizeTimeout = setTimeout(() => {
            console.log("[NewServer WebSocket] Timeout reached");
            cleanup();
            if (finalizeResolver) {
              finalizeResolver({ text: "" });
              finalizeResolver = null;
            }
          }, 15000);
        } else {
          cleanup();
          resolveFinalize({ text: "" });
        }
      });
    };

    const wsUrl = NEW_SERVER_URL.replace(/^http/, "ws") + "/v1/transcribe";
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
          console.log("[NewServer WebSocket] Ready, setting up audio listener");
          isReady = true;

          unlisten = await listen<{ samples: number[] }>(
            "audio_chunk",
            (event) => {
              receivedChunkCount++;
              if (
                ws &&
                ws.readyState === WebSocket.OPEN &&
                !isFinalized &&
                isReady
              ) {
                try {
                  const samples = Array.from(event.payload.samples);
                  ws.send(JSON.stringify({ type: "audio", samples }));
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

          console.log("[NewServer WebSocket] Session ready");
          resolve({ finalize, cleanup });
          return;
        }

        if (msg.type === "transcript") {
          console.log(
            "[NewServer WebSocket] Transcript received:",
            msg.text?.substring(0, 50),
            "processed:",
            !!msg.processed,
          );
          if (finalizeTimeout) {
            clearTimeout(finalizeTimeout);
            finalizeTimeout = null;
          }
          cleanup();
          if (finalizeResolver) {
            const result: TranscriptResult = {
              text: msg.text || "",
              durationMs: msg.durationMs,
            };
            if (msg.processed) {
              result.processed = {
                text: msg.processed.text || "",
                wordsUsed: msg.processed.wordsUsed || 0,
                tokensUsed: msg.processed.tokensUsed || 0,
                durationMs: msg.processed.durationMs,
              };
            }
            finalizeResolver(result);
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
      if (!isReady) {
        reject(new Error("Connection closed before ready"));
      }
    };
  });
};

export class NewServerTranscriptionSession implements TranscriptionSession {
  private session: NewServerStreamingSession | null = null;

  async onRecordingStart(sampleRate: number): Promise<void> {
    try {
      console.log("[NewServer] Starting streaming session...");

      const state = getAppState();
      const entries = collectDictionaryEntries(state);
      const glossary = ["Voquill", ...entries.sources];
      const user = getMyUser(state);
      const language = user?.preferredLanguage ?? undefined;

      this.session = await startNewServerStreaming(
        sampleRate,
        glossary,
        language,
      );
      console.log("[NewServer] Streaming session started successfully");
    } catch (error) {
      console.error("[NewServer] Failed to start streaming:", error);
    }
  }

  async finalize(
    _audio: StopRecordingResponse,
    options?: TranscriptionSessionFinalizeOptions,
  ): Promise<TranscriptionSessionResult> {
    if (!this.session) {
      return {
        rawTranscript: null,
        metadata: {
          inferenceDevice: "Cloud • New Server (Streaming)",
          transcriptionMode: "cloud",
        },
        warnings: ["New server streaming session was not established"],
      };
    }

    try {
      console.log("[NewServer] Finalizing streaming session...");

      const state = getAppState();
      const dictationLanguage = await loadMyEffectiveDictationLanguage(state);
      const toneTemplate = getToneTemplateWithFallback(
        state,
        options?.toneId ?? null,
      );
      const textFieldContext = extractTextFieldContext(
        options?.a11yInfo as Nullable<TextFieldInfo>,
      );

      const systemPrompt = buildSystemPostProcessingTonePrompt();
      const userPrompt = buildLocalizedPostProcessingPrompt({
        transcript: "{{transcript}}",
        dictationLanguage,
        toneTemplate,
        textFieldContext: textFieldContext ?? null,
      });

      const prompt: ProcessMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
      console.log("[NewServer] Including post-processing prompt");

      const result = await this.session.finalize(prompt);

      console.log("[NewServer] Transcript timing:", {
        transcriptionMs: result.durationMs,
        postProcessMs: result.processed?.durationMs,
      });
      console.log("[NewServer] Received transcript:", {
        rawLength: result.text?.length ?? 0,
        processedLength: result.processed?.text?.length ?? 0,
        preview:
          result.text?.substring(0, 50) +
          (result.text && result.text.length > 50 ? "..." : ""),
      });

      return {
        rawTranscript: result.text || null,
        processedTranscript: result.processed?.text || null,
        metadata: {
          inferenceDevice: "Cloud • New Server (Streaming)",
          transcriptionMode: "cloud",
          transcriptionDurationMs: result.durationMs ?? null,
        },
        postProcessMetadata: result.processed
          ? {
              postProcessPrompt: userPrompt,
              postProcessMode: "cloud",
              postProcessDevice: "Cloud • New Server",
              postprocessDurationMs: result.processed.durationMs ?? null,
            }
          : undefined,
        warnings: [],
      };
    } catch (error) {
      console.error("[NewServer] Failed to finalize session:", error);
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
}
