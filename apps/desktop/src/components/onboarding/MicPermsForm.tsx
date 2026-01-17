import { ArrowForward, Mic } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const MicPermsForm = () => {
  const handleEnable = () => {
    // TODO: Request microphone permissions
  };

  const handleContinue = () => {
    goToOnboardingPage("a11yPerms");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Set up your microphone" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Voquill only activates your microphone when you choose to start recording." />
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Mic />}
          onClick={handleEnable}
          sx={{ alignSelf: "flex-start" }}
        >
          <FormattedMessage defaultMessage="Enable microphone" />
        </Button>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/podcast.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
