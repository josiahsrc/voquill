import { getAppState, produceAppState } from "../store";
import { transcribeAndPostProcessAudio } from "./transcribe.actions";
import { getTranscriptionRepo } from "../repos";
import { getRec } from "@repo/utilities";

export const openTranscriptionDetailsDialog = (transcriptionId: string) => {
  produceAppState((draft) => {
    draft.transcriptions.detailsDialogTranscriptionId = transcriptionId;
    draft.transcriptions.detailsDialogOpen = true;
  });
};

export const closeTranscriptionDetailsDialog = () => {
  produceAppState((draft) => {
    draft.transcriptions.detailsDialogOpen = false;
  });
};

type RetranscribeTranscriptionParams = {
  transcriptionId: string;
  toneId?: string | null;
};

export const retranscribeTranscription = async ({
  transcriptionId,
  toneId,
}: RetranscribeTranscriptionParams): Promise<void> => {
  const state = getAppState();
  const transcription = getRec(state.transcriptionById, transcriptionId);

  if (!transcription) {
    throw new Error("Transcription not found.");
  }

  const repo = getTranscriptionRepo();
  const audioData = await repo.loadTranscriptionAudio(transcriptionId);

  const {
    transcript: finalTranscript,
    rawTranscript,
    warnings,
    metadata,
  } = await transcribeAndPostProcessAudio({
    samples: audioData.samples,
    sampleRate: audioData.sampleRate,
    toneId,
  });

  if (!finalTranscript) {
    throw new Error("Retranscription produced no text.");
  }

  const updatedPayload = {
    ...transcription,
    transcript: finalTranscript,
    modelSize: metadata?.modelSize ?? null,
    inferenceDevice: metadata?.inferenceDevice ?? null,
    rawTranscript: rawTranscript ?? finalTranscript,
    transcriptionPrompt: metadata?.transcriptionPrompt ?? null,
    postProcessPrompt: metadata?.postProcessPrompt ?? null,
    transcriptionApiKeyId: metadata?.transcriptionApiKeyId ?? null,
    postProcessApiKeyId: metadata?.postProcessApiKeyId ?? null,
    transcriptionMode: metadata?.transcriptionMode ?? null,
    postProcessMode: metadata?.postProcessMode ?? null,
    postProcessDevice: metadata?.postProcessDevice ?? null,
    warnings: warnings.length > 0 ? warnings : null,
  };

  const updated = await repo.updateTranscription(updatedPayload);

  produceAppState((draft) => {
    draft.transcriptionById[transcriptionId] = updated;
  });
};
