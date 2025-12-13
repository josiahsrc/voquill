import { ArrowOutwardOutlined } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { setActiveTone } from "../../actions/tone.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyEffectiveUserId } from "../../utils/user.utils";
import { CenterMessage } from "../common/CenterMessage";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { ToneSelect } from "../tones/ToneSelect";
import { StylingRow } from "./StylingRow";

export default function StylingPage() {
  const intl = useIntl();

  const sortedAppTargetIds = useAppStore((state) =>
    Object.values(state.appTargetById)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((target) => target.id),
  );

  const activeToneId = useAppStore((state) => {
    const myUserId = getMyEffectiveUserId(state);
    return state.userPreferencesById[myUserId]?.activeToneId ?? null;
  });

  const handleActiveToneChange = useCallback((toneId: string | null) => {
    void setActiveTone(toneId);
  }, []);

  const openPostProcessingSettings = useCallback(() => {
    produceAppState((draft) => {
      draft.settings.aiPostProcessingDialogOpen = true;
    });
  }, []);

  const postProcessingMode = useAppStore(
    (state) => state.settings.aiPostProcessing.mode,
  );

  if (postProcessingMode === "none") {
    return (
      <CenterMessage
        title={<FormattedMessage defaultMessage="Writing styles unavailable" />}
        subtitle={
          <FormattedMessage defaultMessage="Post-processing must be enabled in order to use writing styles. Update your settings to enable it." />
        }
        action={
          <Button
            onClick={openPostProcessingSettings}
            variant="contained"
            endIcon={<ArrowOutwardOutlined />}
          >
            <FormattedMessage defaultMessage="Open settings" />
          </Button>
        }
      />
    );
  }

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose how you want to sound based on what app you're using." />
      }
      action={
        <ToneSelect
          value={activeToneId}
          trueDefault={true}
          onToneChange={handleActiveToneChange}
          formControlSx={{ minWidth: 200 }}
          label={intl.formatMessage({ defaultMessage: "Default style" })}
        />
      }
      items={sortedAppTargetIds}
      computeItemKey={(id) => id}
      renderItem={(id) => <StylingRow key={id} id={id} />}
      emptyState={
        <Stack
          spacing={1}
          alignItems="flex-start"
          width={300}
          alignSelf="center"
          mx="auto"
        >
          <Typography variant="h6">How it works</Typography>
          <Typography variant="body2">
            1. Open up the app you want to style (like Slack or Chrome).
          </Typography>
          <Typography variant="body2">
            2. Click on the Voquill icon in the menu bar, and click "Register
            this app".
          </Typography>
          <Typography variant="body2">
            3. Go back to Voquill, and select a writing style for that app.
          </Typography>
        </Stack>
      }
    />
  );
}
