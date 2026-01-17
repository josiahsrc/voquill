import { ArrowForward, Email, Google } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goToOnboardingPage,
  setDidSignUpWithAccount,
} from "../../actions/onboarding.actions";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const SignInForm = () => {
  const handleLocal = () => {
    setDidSignUpWithAccount(false);
    goToOnboardingPage("chooseTranscription");
  };

  const handleContinueWithGoogle = () => {
    goToOnboardingPage("username");
  };

  const handleCreateAccount = () => {
    goToOnboardingPage("username");
  };

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/student-going-to-school.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          onClick={handleLocal}
          variant="text"
          endIcon={<ArrowForward />}
          sx={{ color: "text.disabled", fontWeight: 400 }}
        >
          <FormattedMessage defaultMessage="Local set up" />
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={600} pb={1}>
          <FormattedMessage defaultMessage="Create your account" />
        </Typography>

        <Button
          fullWidth
          variant="contained"
          startIcon={<Google />}
          onClick={handleContinueWithGoogle}
        >
          <FormattedMessage defaultMessage="Continue with Google" />
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<Email />}
          onClick={handleCreateAccount}
        >
          <FormattedMessage defaultMessage="Sign up with email" />
        </Button>
      </Stack>
    </OnboardingFormLayout>
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
