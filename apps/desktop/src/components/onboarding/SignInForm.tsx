import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import {
  goToOnboardingPage,
  setDidSignUpWithAccount,
} from "../../actions/onboarding.actions";
import { FormContainer } from "./OnboardingShared";

export const SignInForm = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLocal = () => {
    setDidSignUpWithAccount(false);
    goToOnboardingPage("chooseTranscription");
  };

  const handleSignedUp = () => {
    setDidSignUpWithAccount(true);
    goToOnboardingPage("username");
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Sign In" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Choose how you want to get started." />
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="space-between" mt={4}>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={handleLocal}>
            <FormattedMessage defaultMessage="Local" />
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleSignedUp}
          >
            <FormattedMessage defaultMessage="Sign Up with Account" />
          </Button>
        </Stack>
      </Stack>
    </FormContainer>
  );
};
