import { ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { FormContainer } from "./OnboardingShared";

export const UnlockedProForm = () => {
  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="You've Unlocked Pro!" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Congratulations! You have unlocked Pro features." />
      </Typography>

      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={() => goToOnboardingPage("tutorial")}
        >
          <FormattedMessage defaultMessage="Next" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
