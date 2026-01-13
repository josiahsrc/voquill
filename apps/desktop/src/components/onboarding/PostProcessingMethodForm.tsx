import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AIPostProcessingConfiguration } from "../settings/AIPostProcessingConfiguration";
import { FormContainer } from "./OnboardingShared";

export const PostProcessingMethodForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.aiPostProcessing,
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Pick your post-processing" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Choose if Voquill should enhance transcripts automatically after they are transcribed." />
      </Typography>

      <AIPostProcessingConfiguration hideCloudOption={true} />

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          onClick={() => goToOnboardingPage("hotkeys")}
          disabled={!canContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
