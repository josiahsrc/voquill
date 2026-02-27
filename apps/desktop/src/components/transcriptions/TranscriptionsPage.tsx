import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { TranscriptionsSideEffects } from "./TranscriptionsSideEffects";
import { TranscriptionRow } from "./TranscriptRow";

export default function TranscriptionsPage() {
  const transcriptionIds = useAppStore(
    (state) => state.transcriptions.transcriptionIds,
  );

  return (
    <>
      <TranscriptionsSideEffects />
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
