import { fetch } from "@tauri-apps/plugin-http";

export const SPEACHES_DEFAULT_URL = "http://localhost:8000";
export const SPEACHES_DEFAULT_MODEL = "Systran/faster-whisper-large-v3";

export type SpeachesTestIntegrationArgs = {
  baseUrl?: string;
};

export const speachesTestIntegration = async ({
  baseUrl = SPEACHES_DEFAULT_URL,
}: SpeachesTestIntegrationArgs): Promise<boolean> => {
  const url = baseUrl.replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${url}/health`);
  } catch (error) {
    throw new Error(
      `Unable to connect to Speaches at ${url}. Make sure Speaches is running. ${error}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Speaches returned an error (status ${response.status}). Check your configuration.`,
    );
  }

  return true;
};

export type SpeachesTranscriptionArgs = {
  baseUrl: string;
  model: string;
  blob: ArrayBuffer;
  ext: string;
  prompt?: string;
  language?: string;
};

export type SpeachesTranscribeAudioOutput = {
  text: string;
};

export const speachesTranscribeAudio = async ({
  baseUrl,
  model,
  blob,
  ext,
  prompt,
  language,
}: SpeachesTranscriptionArgs): Promise<SpeachesTranscribeAudioOutput> => {
  const url = baseUrl.replace(/\/$/, "");

  const formData = new FormData();
  const file = new Blob([blob], { type: `audio/${ext}` });
  formData.append("file", file, `audio.${ext}`);
  formData.append("model", model);
  if (prompt) {
    formData.append("prompt", prompt);
  }
  if (language) {
    formData.append("language", language);
  }

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

  return { text: data.text };
};
