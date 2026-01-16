import { Check } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  submitOnboarding,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { FormContainer } from "./OnboardingShared";

export const TutorialForm = () => {
  const submitting = useAppStore((state) => state.onboarding.submitting);

  const handleFinish = () => {
    void submitOnboarding();
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Tutorial" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Learn how to use the app." />
      </Typography>

      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => goBackOnboardingPage()} disabled={submitting}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          endIcon={<Check />}
          onClick={handleFinish}
          disabled={submitting}
        >
          <FormattedMessage defaultMessage="Finish" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
