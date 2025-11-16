import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
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
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose how you want Voquill to sound based on what app you're using." />
      }
      items={sortedTargets}
      computeItemKey={(target) => target.id}
      renderItem={(target) => <StylingRow key={target.id} target={target} />}
    />
  );
}
