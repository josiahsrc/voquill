import Groq, { toFile } from "groq-sdk";

import {
  AudioSource,
  CLEANED_TRANSCRIPTION_JSON_SCHEMA,
  buildChunkFileName,
  buildPostProcessMessages,
  contentToString,
  ensureFileNameHasExt,
  parseCleanedTranscription,
  resolveFileName,
  runWithRetry,
  sanitizeExtension,
  splitAudioIntoSegments,
  splitFileName,
} from "./voice.utils";

type FileInput = Parameters<typeof toFile>[0];

export type AudioInput = AudioSource;

export const TRANSCRIPTION_MODELS = ["whisper-large-v3-turbo"] as const;
export type TranscriptionModel = typeof TRANSCRIPTION_MODELS[number];

export const CHAT_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"] as const;
export type ChatModel = typeof CHAT_MODELS[number];

const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModel =
  TRANSCRIPTION_MODELS[0];
const DEFAULT_CHAT_MODEL: ChatModel = CHAT_MODELS[0];
const DEFAULT_TRANSCRIBE_RETRIES = 0;
const DEFAULT_POST_PROCESS_RETRIES = 1;

export type TranscribeArgs = {
  audio: AudioInput;
  model?: TranscriptionModel;
  prompt?: string;
  ext?: string;
  fileName?: string;
  retries?: number;
};

export type TranscribeOutput = {
  text: string;
};

export type PostProcessTranscriptArgs = {
  prompt?: string;
  transcript: string;
  model?: ChatModel;
  retries?: number;
};

export type PostProcessTranscriptOutput = {
  text: string;
};

export type TestIntegrationArgs = {
  prompt?: string;
  model?: ChatModel;
};

export class VoiceClient {
  private _groq: Groq;

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error("Groq API key is required");
    }

    this._groq = new Groq({
      apiKey: apiKey.trim(),
      // `dangerouslyAllowBrowser` is needed because this runs on a desktop Tauri app.
      // The Tauri app encrypts API keys locally, so this is safe.
      dangerouslyAllowBrowser: true,
    });
  }

  async transcribeAudio(args: TranscribeArgs): Promise<TranscribeOutput> {
    const {
      audio,
      model = DEFAULT_TRANSCRIPTION_MODEL,
      prompt = "",
      ext,
      fileName,
      retries = DEFAULT_TRANSCRIBE_RETRIES,
    } = args;

    const sanitizedExt = sanitizeExtension(ext);
    const resolvedFileName = ensureFileNameHasExt(
      resolveFileName(fileName, sanitizedExt),
      sanitizedExt,
    );
    const fileNameParts = splitFileName(resolvedFileName);
    const effectiveExt = fileNameParts.ext ?? sanitizedExt;

    const segments = await splitAudioIntoSegments(audio);

    return runWithRetry(async () => {
      if (!segments) {
        const file = await toFile(audio as FileInput, resolvedFileName);
        const response = await this._groq.audio.transcriptions.create({
          file,
          model,
          prompt,
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error("Transcription failed");
        }

        return { text };
      }

      const transcripts: string[] = [];
      for (let index = 0; index < segments.length; index += 1) {
        const chunkFileName = buildChunkFileName(
          resolvedFileName,
          index,
          segments.length,
          effectiveExt,
        );
        const file = await toFile(segments[index] as FileInput, chunkFileName);

        const response = await this._groq.audio.transcriptions.create({
          file,
          model,
          prompt,
        });

        const transcript = response.text?.trim();
        if (!transcript) {
          throw new Error(
            `Transcription failed for audio segment ${index + 1}`,
          );
        }

        transcripts.push(transcript);
      }

      const combinedTranscript = transcripts
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join("\n\n")
        .trim();

      if (!combinedTranscript) {
        throw new Error("Transcription failed");
      }

      return { text: combinedTranscript };
    }, retries);
  }

  async postProcessTranscript(
    args: PostProcessTranscriptArgs,
  ): Promise<PostProcessTranscriptOutput> {
    const {
      prompt,
      transcript,
      model = DEFAULT_CHAT_MODEL,
      retries = DEFAULT_POST_PROCESS_RETRIES,
    } = args;

    const messages = buildPostProcessMessages({
      transcript,
      prompt,
    });

    return runWithRetry(async () => {
      const response = await this._groq.chat.completions.create({
        messages,
        model,
        temperature: 1,
        max_completion_tokens: 4000,
        top_p: 1,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "transcription_cleaning",
            description: "JSON response with the cleaned transcription",
            schema: CLEANED_TRANSCRIPTION_JSON_SCHEMA,
          },
        },
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from Groq");
      }

      const first = response.choices[0];
      const content = contentToString(first?.message?.content);
      if (!content) {
        throw new Error("Response content is empty");
      }

      const cleaned = parseCleanedTranscription(content);
      return { text: cleaned };
    }, retries);
  }

  async testIntegration(args: TestIntegrationArgs = {}): Promise<boolean> {
    const {
      prompt = 'Reply with the single word "Hello."',
      model = DEFAULT_CHAT_MODEL,
    } = args;

    const response = await this._groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      model,
      temperature: 0,
      max_completion_tokens: 32,
      top_p: 1,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response from Groq");
    }

    const first = response.choices[0];
    const content = contentToString(first?.message?.content);
    if (!content) {
      throw new Error("Response content is empty");
    }

    return content.toLowerCase().includes("hello");
  }
}

export const createVoiceClient = (apiKey: string): VoiceClient => {
  return new VoiceClient(apiKey);
};
