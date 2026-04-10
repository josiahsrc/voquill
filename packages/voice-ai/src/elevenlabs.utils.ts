import { retry, countWords } from "@voquill/utilities";

export type ElevenLabsTestIntegrationArgs = {
  apiKey: string;
};

export const elevenlabsTestIntegration = async ({
  apiKey,
}: ElevenLabsTestIntegrationArgs): Promise<boolean> => {
  const response = await fetch("https://api.elevenlabs.io/v1/user", {
    method: "GET",
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail
        ? `ElevenLabs responded ${response.status}: ${detail}`
        : `ElevenLabs responded with status ${response.status}`,
    );
  }
  return true;
};

export type ElevenLabsTranscriptionArgs = {
  apiKey: string;
  blob: ArrayBuffer | Buffer;
  ext: string;
  language?: string;
};

export type ElevenLabsTranscribeAudioOutput = {
  text: string;
  wordsUsed: number;
};

export const elevenlabsTranscribeAudio = async ({
  apiKey,
  blob,
  ext,
  language,
}: ElevenLabsTranscriptionArgs): Promise<ElevenLabsTranscribeAudioOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const formData = new FormData();
      const bodyData =
        blob instanceof ArrayBuffer ? blob : (blob.buffer as ArrayBuffer);
      const audioBlob = new Blob([bodyData], { type: `audio/${ext}` });
      formData.append("file", audioBlob, `audio.${ext}`);
      formData.append("model_id", "scribe_v1");
      if (language && language !== "auto") {
        formData.append("language_code", language);
      }

      const response = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey.trim(),
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `ElevenLabs API request failed with status ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as { text?: string };
      const transcript = data?.text;

      if (!transcript) {
        throw new Error(
          "Transcription failed: No text in ElevenLabs API response",
        );
      }

      return { text: transcript, wordsUsed: countWords(transcript) };
    },
  });
};

export const convertFloat32ToBase64PCM16 = (
  float32Array: Float32Array | number[],
): string => {
  const samples = Array.isArray(float32Array)
    ? float32Array
    : Array.from(float32Array);
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
};
