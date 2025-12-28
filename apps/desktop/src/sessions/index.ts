import { Nullable } from "@repo/types";
import { TranscriptionSession } from "../types/transcription-session.types";
import { TranscriptionPrefs } from "../utils/user.utils";
import { AssemblyAITranscriptionSession } from "./assemblyai-transcription-session";
import { BatchTranscriptionSession } from "./batch-transcription-session";

export { AssemblyAITranscriptionSession } from "./assemblyai-transcription-session";
export { BatchTranscriptionSession } from "./batch-transcription-session";

export const createTranscriptionSession = (
  prefs: TranscriptionPrefs,
  toneId: Nullable<string>,
): TranscriptionSession => {
  if (prefs.mode === "api") {
    switch (prefs.provider) {
      case "assemblyai":
        return new AssemblyAITranscriptionSession(prefs.apiKeyValue);
      // Future streaming providers can be added here:
      // case "deepgram":
      //   return new DeepgramTranscriptionSession(prefs.apiKeyValue);
    }
  }

  return new BatchTranscriptionSession(toneId);
};
