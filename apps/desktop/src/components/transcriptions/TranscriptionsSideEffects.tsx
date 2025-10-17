import { useAsyncEffect } from "../../hooks/async.hooks";
import { useOnExit } from "../../hooks/helper.hooks";
import { getTranscriptionRepo } from "../../repos";
import { INITIAL_TRANSCRIPTIONS_STATE } from "../../state/transcriptions.state";
import { produceAppState } from "../../store";
import { registerTranscriptions } from "../../utils/app.utils";

export const TranscriptionsSideEffects = () => {
  useAsyncEffect(async () => {
    const transcriptions = await getTranscriptionRepo().listTranscriptions();
    produceAppState((draft) => {
      registerTranscriptions(draft, transcriptions);
      draft.transcriptions.transcriptionIds = transcriptions.map((t) => t.id);
    });
  }, []);

  useOnExit(() => {
    produceAppState((draft) => {
      Object.assign(draft.transcriptions, INITIAL_TRANSCRIPTIONS_STATE);
    });
  });

  return null;
};
