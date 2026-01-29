import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";

export type SpeachesTestIntegrationArgs = {
  baseUrl: string;
};

export const speachesTestIntegration = async ({
  baseUrl,
}: SpeachesTestIntegrationArgs): Promise<boolean> => {
  const url = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${url}/health`);
  return response.ok;
};

export type SpeachesTranscriptionArgs = {
  baseUrl: string;
  model: string;
  blob: ArrayBuffer | Buffer;
  ext: string;
  prompt?: string;
  language?: string;
};

export type SpeachesTranscribeAudioOutput = {
  text: string;
  wordsUsed: number;
};

export const speachesTranscribeAudio = async ({
  baseUrl,
  model,
  blob,
  ext,
  prompt,
  language,
}: SpeachesTranscriptionArgs): Promise<SpeachesTranscribeAudioOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const formData = new FormData();
      const arrayBuffer =
        blob instanceof ArrayBuffer ? blob : new Uint8Array(blob).buffer;
      const file = new Blob([arrayBuffer], { type: `audio/${ext}` });
      formData.append("file", file, `audio.${ext}`);
      formData.append("model", model);
      if (prompt) {
        formData.append("prompt", prompt);
      }
      if (language) {
        formData.append("language", language);
      }

      const url = baseUrl.replace(/\/$/, "");
      const response = await fetch(`${url}/v1/audio/transcriptions`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Speaches transcription failed: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as { text?: string };

      if (!data.text) {
        throw new Error("Transcription failed: no text in response");
      }

      return { text: data.text, wordsUsed: countWords(data.text) };
    },
  });
};
