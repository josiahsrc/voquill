import { isGeminiEndToEndModel, isOpenAIRealtimeModel } from "@repo/voice-ai";
import { getRec } from "@repo/utilities";
import { getAppState } from "../store";
import { TranscriptionSession } from "../types/transcription-session.types";
import { getIsEnterpriseEnabled } from "../utils/enterprise.utils";
import { getIsEmulators } from "../utils/env.utils";
import { TranscriptionPrefs } from "../utils/user.utils";
import { AssemblyAITranscriptionSession } from "./assemblyai-transcription-session";
import { AzureTranscriptionSession } from "./azure-transcription-session";
import { BatchTranscriptionSession } from "./batch-transcription-session";
import { DeepgramTranscriptionSession } from "./deepgram-transcription-session";
import { GeminiNativeAudioTranscriptionSession } from "./gemini-native-audio-transcription-session";
import { ElevenLabsTranscriptionSession } from "./elevenlabs-transcription-session";
import { NewServerTranscriptionSession } from "./new-server-transcription-session";
import { OpenAIRealtimeTranscriptionSession } from "./openai-realtime-transcription-session";
import { OpenAIStreamingTranscriptionSession } from "./openai-streaming-transcription-session";

export { AssemblyAITranscriptionSession } from "./assemblyai-transcription-session";
export { AzureTranscriptionSession } from "./azure-transcription-session";
export { BatchTranscriptionSession } from "./batch-transcription-session";
export { DeepgramTranscriptionSession } from "./deepgram-transcription-session";
export { ElevenLabsTranscriptionSession } from "./elevenlabs-transcription-session";
export { NewServerTranscriptionSession } from "./new-server-transcription-session";
export { OpenAIRealtimeTranscriptionSession } from "./openai-realtime-transcription-session";
export { OpenAIStreamingTranscriptionSession } from "./openai-streaming-transcription-session";

export const createTranscriptionSession = (
  prefs: TranscriptionPrefs,
): TranscriptionSession => {
  if (prefs.mode === "api") {
    switch (prefs.provider) {
      case "assemblyai":
        return new AssemblyAITranscriptionSession(prefs.apiKeyValue);
      case "deepgram":
        return new DeepgramTranscriptionSession(prefs.apiKeyValue);
      case "elevenlabs":
        return new ElevenLabsTranscriptionSession(prefs.apiKeyValue);
      case "openai": {
        const model = prefs.transcriptionModel;
        if (model && isOpenAIRealtimeModel(model)) {
          return new OpenAIRealtimeTranscriptionSession(prefs.apiKeyValue, model);
        }
        if (
          model === "gpt-4o-transcribe" ||
          model === "gpt-4o-mini-transcribe"
        ) {
          return new OpenAIStreamingTranscriptionSession(
            prefs.apiKeyValue,
            model,
          );
        }
        break;
      }
      case "gemini": {
        const model = prefs.transcriptionModel;
        if (model && isGeminiEndToEndModel(model)) {
          return new GeminiNativeAudioTranscriptionSession(prefs.apiKeyValue, model);
        }
        break;
      }
      case "azure": {
        const state = getAppState();
        const apiKeyRecord = getRec(state.apiKeyById, prefs.apiKeyId);
        const region = apiKeyRecord?.azureRegion || "eastus";
        return new AzureTranscriptionSession(prefs.apiKeyValue, region);
      }
    }
  }

  if (
    prefs.mode === "cloud" &&
    !getIsEnterpriseEnabled() &&
    !getIsEmulators()
  ) {
    return new NewServerTranscriptionSession();
  }

  return new BatchTranscriptionSession();
};
