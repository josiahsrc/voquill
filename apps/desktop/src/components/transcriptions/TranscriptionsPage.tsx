import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { TranscriptionsSideEffects } from "./TranscriptionsSideEffects";
import { TranscriptionRow } from "./TranscriptRow";
import { TranscriptionDetailsDialog } from "./TranscriptionDetailsDialog";
import { FormattedMessage } from "react-intl";

export default function TranscriptionsPage() {
  const transcriptionIds = useAppStore(
    (state) => state.transcriptions.transcriptionIds,
  );

  return (
    <>
      <TranscriptionsSideEffects />
      <TranscriptionDetailsDialog />
      <VirtualizedListPage
        title={<FormattedMessage defaultMessage="History" />}
        subtitle={
          <FormattedMessage
            defaultMessage="{count} {count, plural, one {transcription} other {transcriptions}}"
            values={{ count: transcriptionIds.length }}
          />
        }
        items={transcriptionIds}
        computeItemKey={(id) => id}
        renderItem={(id) => <TranscriptionRow key={id} id={id} />}
      />
    </>
  );
}
