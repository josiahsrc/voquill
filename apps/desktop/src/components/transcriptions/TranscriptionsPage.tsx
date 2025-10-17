import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { TranscriptionsSideEffects } from "./TranscriptionsSideEffects";
import { TranscriptionRow } from "./TranscriptRow";

export default function TranscriptionsPage() {
  const transcriptionIds = useAppStore(
    (state) => state.transcriptions.transcriptionIds
  );

  return (
    <>
      <TranscriptionsSideEffects />
      <VirtualizedListPage
        title="History"
        subtitle={`${transcriptionIds.length} transcription${transcriptionIds.length !== 1 ? "s" : ""}`}
        items={transcriptionIds}
        computeItemKey={(id) => id}
        renderItem={(id) => <TranscriptionRow key={id} id={id} />}
      />
    </>
  );
}
