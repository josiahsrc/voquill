import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AITranscriptionConfiguration } from "../settings/AITranscriptionConfiguration";
import { FormContainer } from "./OnboardingShared";

export const TranscriptionMethodForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.aiTranscription,
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Choose your transcription setup" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Decide how Voquill should transcribe your recordings—locally or through an API-powered service." />
      </Typography>

      <AITranscriptionConfiguration hideCloudOption={true} />

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          onClick={() => goToOnboardingPage("postProcessing")}
          disabled={!canContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
