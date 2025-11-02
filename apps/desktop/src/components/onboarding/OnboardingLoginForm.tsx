import { Button, Card, Stack, Typography } from "@mui/material";
import { goBackOnboardingPage } from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { LoginForm } from "../login/LoginForm";
import { FormContainer } from "./OnboardingShared";

export const OnboardingLoginForm = () => {
  const loggingIn = useAppStore((state) => state.onboarding.loggingIn);

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Sign in to continue
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        We&apos;ll connect your account and launch checkout right after you sign
        in.
      </Typography>

      <Card
        sx={{
          p: 2,
          flex: "0 0 auto",
        }}
      >
        <LoginForm />
      </Card>

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()} disabled={loggingIn}>
          Back
        </Button>
      </Stack>
    </FormContainer>
  );
};
