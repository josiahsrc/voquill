import type { Nullable } from "@repo/types";
import OpenAI, { toFile } from "openai";

export type TranscribeInput = {
  audioBuffer: Buffer;
  mimeType: string;
  prompt?: Nullable<string>;
  language?: string;
};

export abstract class BaseSttApi {
  abstract transcribe(input: TranscribeInput): Promise<{ text: string }>;
  abstract pullModel(): Promise<{ done: boolean; error?: string }>;
}

export class SpeachesSttApi extends BaseSttApi {
  private client: OpenAI;
  private model: string;
  private baseURL: string;
  private apiKey: string;

  constructor(opts: { url: string; apiKey: string; model: string }) {
    super();
    const url = `${opts.url}/v1`;
    this.client = new OpenAI({
      baseURL: url,
      apiKey: opts.apiKey,
    });
    this.model = opts.model;
    this.baseURL = url;
    this.apiKey = opts.apiKey;
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

  async pullModel(): Promise<{ done: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseURL}/models/${this.model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (res.ok) {
        return { done: true };
      }
      const text = await res.text().catch(() => res.statusText);
      return { done: false, error: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { done: false, error: message };
    }
  }
}
