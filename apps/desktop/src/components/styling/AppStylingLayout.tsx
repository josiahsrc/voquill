import { Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { loadTones, setActiveTone } from "../../actions/tone.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useAppStore } from "../../store";
import { getGenerativePrefs } from "../../utils/user.utils";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { ToneSelect } from "../tones/ToneSelect";
import { PostProcessingDisabledTooltip } from "./PostProcessingDisabledTooltip";
import { AppStylingRow } from "./AppStylingRow";

export function AppStylingLayout() {
  const intl = useIntl();

  useAsyncEffect(async () => {
    await loadTones();
  }, []);

  const sortedAppTargetIds = useAppStore((state) =>
    Object.values(state.appTargetById)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((target) => target.id),
  );

  const activeToneId = useAppStore((state) => {
    return state.userPrefs?.activeToneId ?? null;
  });

  const handleActiveToneChange = useCallback((toneId: string | null) => {
    void setActiveTone(toneId);
  }, []);

  const isPostProcessingDisabled = useAppStore(
    (state) => getGenerativePrefs(state).mode === "none",
  );

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose how you want to sound based on what app you're using." />
      }
      action={
        <PostProcessingDisabledTooltip disabled={isPostProcessingDisabled}>
          <ToneSelect
            value={activeToneId}
            trueDefault={true}
            onToneChange={handleActiveToneChange}
            formControlSx={{ minWidth: 200 }}
            label={intl.formatMessage({ defaultMessage: "Default style" })}
            disabled={isPostProcessingDisabled}
          />
        </PostProcessingDisabledTooltip>
      }
      items={sortedAppTargetIds}
      computeItemKey={(id) => id}
      renderItem={(id) => <AppStylingRow key={id} id={id} />}
      emptyState={
        <Stack
          spacing={1}
          alignItems="flex-start"
          width={300}
          alignSelf="center"
          mx="auto"
        >
          <Typography variant="h6">
            <FormattedMessage defaultMessage="How it works" />
          </Typography>
          <Typography variant="body2">
            <FormattedMessage defaultMessage="1. Open up the app you want to style (like Slack or Chrome)." />
          </Typography>
          <Typography variant="body2">
            <FormattedMessage defaultMessage='2. Click on the Voquill icon in the menu bar, and click "Register this app".' />
          </Typography>
          <Typography variant="body2">
            <FormattedMessage defaultMessage="3. Go back to Voquill, and select a writing style for that app." />
          </Typography>
        </Stack>
      }
    />
  );
}
