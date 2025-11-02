import { Google } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import {
  goBackOnboardingPage,
  loginWithGoogleForOnboarding,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { FormContainer } from "./OnboardingShared";

export const LoginForm = () => {
  const loggingIn = useAppStore((state) => state.onboarding.loggingIn);
  const selectedPlan = useAppStore((state) => state.onboarding.plan);

  const handleLogin = () => {
    void loginWithGoogleForOnboarding();
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Sign in to continue
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        We&apos;ll connect your {selectedPlan === "pro" ? "Pro" : "Voquill"} account
        and launch checkout right after you sign in.
      </Typography>

      <Stack spacing={2} alignItems="flex-start">
        <Button
          variant="contained"
          startIcon={<Google />}
          onClick={handleLogin}
          disabled={loggingIn}
        >
          {loggingIn ? "Signing in..." : "Continue with Google"}
        </Button>
        <Typography variant="caption" color="text.secondary">
          You&apos;ll return here once sign-in completes so you can finish setup.
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => goBackOnboardingPage()} disabled={loggingIn}>
          Back
        </Button>
      </Stack>
    </FormContainer>
  );
};
