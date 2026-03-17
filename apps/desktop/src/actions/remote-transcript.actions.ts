import type { Transcription } from "@repo/types";
import dayjs from "dayjs";
import { getTranscriptionRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { createId } from "../utils/id.utils";
import { getLogger } from "../utils/log.utils";
import { getMyEffectiveUserId, getMyUserPreferences } from "../utils/user.utils";
import { insertLocalTranscriptOutput } from "../utils/output-routing.utils";
import { showSnackbar } from "./app.actions";

const REMOTE_TRANSCRIPT_WARNING_PREFIX = "Remote transcript received from";

export type RemoteFinalTextReceivedPayload = {
  senderDeviceId: string;
  eventId: string;
  text: string;
  mode: string;
  createdAt: string;
};

const storeRemoteTranscription = async ({
  senderDeviceId,
  rawTranscript,
  transcript,
}: {
  senderDeviceId: string;
  rawTranscript: string;
  transcript: string;
}): Promise<void> => {
  const state = getAppState();
  if (getMyUserPreferences(state)?.incognitoModeEnabled) {
    return;
  }

  const transcription: Transcription = {
    id: createId(),
    createdAt: dayjs().toISOString(),
    createdByUserId: getMyEffectiveUserId(state),
    transcript,
    isDeleted: false,
    rawTranscript,
    sanitizedTranscript: rawTranscript,
    modelSize: null,
    inferenceDevice: null,
    transcriptionPrompt: null,
    postProcessPrompt: null,
    transcriptionApiKeyId: null,
    postProcessApiKeyId: null,
    transcriptionMode: null,
    postProcessMode: null,
    postProcessDevice: null,
    transcriptionDurationMs: null,
    postprocessDurationMs: null,
    warnings: [`${REMOTE_TRANSCRIPT_WARNING_PREFIX} ${senderDeviceId}.`],
  };

  const stored = await getTranscriptionRepo().createTranscription(transcription);
  produceAppState((draft) => {
    draft.transcriptionById[stored.id] = stored;
    draft.transcriptions.transcriptionIds = [
      stored.id,
      ...draft.transcriptions.transcriptionIds.filter((id) => id !== stored.id),
    ];
  });
};

export const handleRemoteFinalTextReceived = async (
  payload: RemoteFinalTextReceivedPayload,
): Promise<void> => {
  const finalText = payload.text.trim();
  if (!finalText) {
    return;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 20));
  await insertLocalTranscriptOutput(
    `${finalText} `,
    null,
  );
  await storeRemoteTranscription({
    senderDeviceId: payload.senderDeviceId,
    rawTranscript: finalText,
    transcript: finalText,
  }).catch((error) => {
    getLogger().warning(`Failed to store remote transcript: ${error}`);
  });

  showSnackbar("Remote transcript inserted.", { mode: "success" });
};
