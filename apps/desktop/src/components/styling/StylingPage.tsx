import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { useAppStore } from "../../store";
import { StylingRow } from "./StylingRow";

export default function StylingPage() {
  const appTargets = useAppStore((state) => Object.values(state.appTargetById));

  const sortedTargets = useMemo(
    () =>
      [...appTargets].sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
    [appTargets]
  );

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Styling" />}
      subtitle={
        <FormattedMessage defaultMessage="These are the applications Voquill keeps track of for styling context." />
      }
      items={sortedTargets}
      computeItemKey={(target) => target.id}
      renderItem={(target) => <StylingRow key={target.id} target={target} />}
    />
  );
}
