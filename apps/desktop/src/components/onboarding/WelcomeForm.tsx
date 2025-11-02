import { ArrowForward } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { FormContainer } from "./OnboardingShared";

export const WelcomeForm = () => {
  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        🚢 Welcome aboard!
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Excited to have you here! We need to run through a quick setup to get
        you started.
      </Typography>
      <Button
        variant="contained"
        endIcon={<ArrowForward />}
        onClick={() => goToOnboardingPage("name")}
      >
        Let's do this
      </Button>
    </FormContainer>
  );
};
