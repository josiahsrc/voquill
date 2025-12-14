import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { FormContainer } from "./OnboardingShared";
import { useAppStore } from "../../store";
import { getIsLoggedIn } from "../../utils/user.utils";

export const WelcomeForm = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAppStore(getIsLoggedIn);
  const canGoBack =
    !isLoggedIn && typeof window !== "undefined"
      ? (window.history.state?.idx ?? 0) > 0
      : false;

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="🚢 Welcome aboard!" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Excited to have you here! We need to run through a quick setup to get you started." />
      </Typography>
      <Stack
        direction="row"
        justifyContent={canGoBack ? "space-between" : "flex-end"}
        alignItems="center"
        mt={4}
      >
        {canGoBack && (
          <Button startIcon={<ArrowBack />} onClick={handleGoBack}>
            <FormattedMessage defaultMessage="Back" />
          </Button>
        )}
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={() => goToOnboardingPage("name")}
        >
          <FormattedMessage defaultMessage="Let's do this" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
