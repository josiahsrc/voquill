import { firemix } from "@firemix/client";
import { Transcription } from "@repo/types";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { getTranscriptionRepo } from "../../repos";
import { getMyUserId } from "../../utils/user.utils";
import { getAppState } from "../../store";

type TranscriptionReceivedPayload = {
  text: string;
};

export const RootSideEffects = () => {
  useTauriListen<TranscriptionReceivedPayload>(
    "transcription_received",
    async (payload) => {
      const normalizedTranscript = payload.text.trim();
      if (!normalizedTranscript) {
        return;
      }

      const transcription: Transcription = {
        id: crypto.randomUUID(),
        transcript: normalizedTranscript,
        createdAt: firemix().now(),
        createdByUserId: getMyUserId(getAppState()),
        isDeleted: false,
      };

      await getTranscriptionRepo().createTranscription(transcription);
    },
  );

  return null;
};
