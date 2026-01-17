import { ArrowForward } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AIPostProcessingConfiguration } from "../settings/AIPostProcessingConfiguration";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const ChooseLlmForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.aiPostProcessing,
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  const handleContinue = () => {
    goToOnboardingPage("username");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Set up post-processing" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Choose if Voquill should enhance transcripts automatically after they are transcribed." />
          </Typography>
        </Box>

        <AIPostProcessingConfiguration hideCloudOption={true} />
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/designer.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
