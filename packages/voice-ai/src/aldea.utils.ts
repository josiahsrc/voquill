import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";

const ALDEA_API_URL = "https://api.aldea.ai/v1/listen";

export type AldeaTranscriptionArgs = {
  apiKey: string;
  blob: ArrayBuffer | Buffer;
  ext?: string;
  language?: string;
};

export type AldeaTranscribeAudioOutput = {
  text: string;
  wordsUsed: number;
};

type AldeaResponse = {
  metadata?: {
    channels?: number;
    duration?: number;
    request_id?: string;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        confidence?: number;
        transcript?: string;
        words?: unknown[];
      }>;
    }>;
  };
};

export const aldeaTranscribeAudio = async ({
  apiKey,
  blob,
  ext,
  language,
}: AldeaTranscriptionArgs): Promise<AldeaTranscribeAudioOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const bodyData = blob instanceof ArrayBuffer ? blob : (blob.buffer as ArrayBuffer);
      const response = await fetch(ALDEA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: bodyData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Aldea API request failed with status ${response.status}: ${errorText}`,
        );
      }

      const data: AldeaResponse = await response.json();

      const transcript =
        data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

      if (!transcript) {
        throw new Error(
          "Transcription failed: No transcript in Aldea API response",
        );
      }

      return { text: transcript, wordsUsed: countWords(transcript) };
    },
  });
};

export type AldeaTestIntegrationArgs = {
  apiKey: string;
};

export const aldeaTestIntegration = async ({
  apiKey,
}: AldeaTestIntegrationArgs): Promise<boolean> => {
  try {
    const response = await fetch(ALDEA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: new ArrayBuffer(0),
    });

    return response.ok || response.status === 400;
  } catch (error) {
    throw new Error(
      `Aldea integration test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
