import { Transcription } from "@repo/types";
import { getRec } from "@repo/utilities";
import { getTranscriptionRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import {
  applyReplacements,
  applySymbolConversions,
} from "../utils/string.utils";
import { postProcessTranscript, transcribeAudio } from "./transcribe.actions";

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

  const transcribeResult = await transcribeAudio({
    samples: audioData.samples,
    sampleRate: audioData.sampleRate,
  });

  const rawTranscript = transcribeResult.rawTranscript;

  const replacementRules = Object.values(state.termById)
    .filter((term) => term.isReplacement)
    .map((term) => ({
      sourceValue: term.sourceValue,
      destinationValue: term.destinationValue,
    }));

  const afterReplacements = applyReplacements(rawTranscript, replacementRules);
  const sanitizedTranscript = applySymbolConversions(afterReplacements);

  const postProcessResult = await postProcessTranscript({
    rawTranscript: sanitizedTranscript,
    toneId: toneId ?? null,
  });

  const finalTranscript = postProcessResult.transcript;

  const warnings = [
    ...transcribeResult.warnings,
    ...postProcessResult.warnings,
  ];
  const metadata = {
    ...transcribeResult.metadata,
    ...postProcessResult.metadata,
  };

  if (!finalTranscript) {
    throw new Error("Retranscription produced no text.");
  }

  const updatedPayload: Transcription = {
    ...transcription,
    transcript: finalTranscript,
    sanitizedTranscript,
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
