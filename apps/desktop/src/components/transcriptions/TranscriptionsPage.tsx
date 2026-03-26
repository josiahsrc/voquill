import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { ScrollListPage } from "../common/ScrollListPage";
import { TranscriptionsSideEffects } from "./TranscriptionsSideEffects";
import { TranscriptionRow } from "./TranscriptRow";

export default function TranscriptionsPage() {
  const transcriptionIds = useAppStore(
    (state) => state.transcriptions.transcriptionIds,
  );

  return (
    <>
      <TranscriptionsSideEffects />
      <ScrollListPage
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
