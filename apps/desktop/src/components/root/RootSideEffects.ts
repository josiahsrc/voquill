import { firemix } from "@firemix/client";
import { Transcription } from "@repo/types";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { getTranscriptionRepo } from "../../repos";
import { getMyUserId } from "../../utils/user.utils";
import { getAppState, produceAppState } from "../../store";
import { isEqual } from "lodash-es";

type TranscriptionReceivedPayload = {
  text: string;
};

type KeysHeldPayload = {
  keys: string[];
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

  useTauriListen<KeysHeldPayload>("keys_held", (payload) => {
    const existing = getAppState().keysHeld;
    if (isEqual(existing, payload.keys)) {
      return;
    }

    produceAppState((draft) => {
      draft.keysHeld = payload.keys;
    });
  });

  return null;
};
