import { FormattedMessage, useIntl } from "react-intl";
import { useCallback } from "react";
import { useAppStore } from "../../store";
import { getMyEffectiveUserId } from "../../utils/user.utils";
import { setActiveTone } from "../../actions/tone.actions";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { StylingRow } from "./StylingRow";
import { ToneSelect } from "../tones/ToneSelect";

export default function StylingPage() {
  const intl = useIntl();

  const sortedAppTargetIds = useAppStore((state) =>
    Object.values(state.appTargetById)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((target) => target.id)
  );

  const activeToneId = useAppStore((state) => {
    const myUserId = getMyEffectiveUserId(state);
    return state.userPreferencesById[myUserId]?.activeToneId ?? null;
  });

  const handleActiveToneChange = useCallback((toneId: string | null) => {
    void setActiveTone(toneId);
  }, []);

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose how you want to sound based on what app you're using." />
      }
      action={
        <ToneSelect
          value={activeToneId}
          onToneChange={handleActiveToneChange}
          includeDefaultOption={false}
          formControlSx={{ minWidth: 200 }}
          label={intl.formatMessage({ defaultMessage: "Default style" })}
        />
      }
      items={sortedAppTargetIds}
      computeItemKey={(id) => id}
      renderItem={(id) => <StylingRow key={id} id={id} />}
    />
  );
}
