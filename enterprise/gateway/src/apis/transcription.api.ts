import type { Nullable } from "@repo/types";
import OpenAI, { toFile } from "openai";

export type TranscribeInput = {
  audioBuffer: Buffer;
  mimeType: string;
  prompt?: Nullable<string>;
  language?: string;
};

export abstract class BaseTranscriptionApi {
  abstract transcribe(input: TranscribeInput): Promise<{ text: string }>;
}

export class SpeachesTranscriptionApi extends BaseTranscriptionApi {
  private client: OpenAI;
  private model: string;

  constructor(opts: { url: string; apiKey: string; model: string }) {
    super();
    this.client = new OpenAI({ baseURL: opts.url, apiKey: opts.apiKey });
    this.model = opts.model;
  }

  async transcribe(input: TranscribeInput): Promise<{ text: string }> {
    const ext = input.mimeType.split("/").pop() ?? "wav";
    const file = await toFile(input.audioBuffer, `audio.${ext}`, {
      type: input.mimeType,
    });
    const result = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
      prompt: input.prompt ?? undefined,
      language: input.language,
    });
    return { text: result.text };
  }
}
