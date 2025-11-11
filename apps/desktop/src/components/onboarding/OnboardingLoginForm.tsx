import { ArrowForward } from "@mui/icons-material";
import { Button, Card, Stack, Typography } from "@mui/material";
import { invokeHandler } from "@repo/functions";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { openPaymentDialog } from "../../actions/payment.actions";
import {
  setPreferredPostProcessingMode,
  setPreferredTranscriptionMode,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useAppStore } from "../../store";
import { getMyMember } from "../../utils/member.utils";
import { getPriceIdFromKey } from "../../utils/price.utils";
import { LoginForm } from "../login/LoginForm";
import { FormContainer } from "./OnboardingShared";

export const OnboardingLoginForm = () => {
  const loggingIn = useAppStore((state) => state.onboarding.loggingIn);
  const currentUserId = useAppStore((state) => state.auth?.uid);
  const memberPlan = useAppStore((state) => getMyMember(state)?.plan);

  const goToNextPage = () => {
    goToOnboardingPage("hotkeys");
    setPreferredPostProcessingMode("cloud");
    setPreferredTranscriptionMode("cloud");
  };

  const handleOpenPaymentDialog = async () => {
    const member = await invokeHandler("member/getMyMember", {}).then(
      (res) => res.member
    );
    if (member?.plan !== "pro") {
      openPaymentDialog(getPriceIdFromKey("pro_monthly"));
    } else {
      goToNextPage();
    }
  };

  useAsyncEffect(async () => {
    if (currentUserId) {
      handleOpenPaymentDialog();
    }
  }, [currentUserId]);

  useAsyncEffect(async () => {
    if (memberPlan === "pro") {
      goToNextPage();
    }
  }, [memberPlan]);

  if (currentUserId) {
    return (
      <FormContainer>
        <Typography variant="h6" gutterBottom>
          You are logged in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You haven't completed checkout yet. Click the "Next" button below to
          proceed to checkout.
          <br />
          <br />
          You can always go back if you changed your mind!
        </Typography>

        <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
          <Button onClick={() => goBackOnboardingPage()} disabled={loggingIn}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenPaymentDialog}
            endIcon={<ArrowForward />}
          >
            Next
          </Button>
        </Stack>
      </FormContainer>
    );
  }

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
          px: 3,
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
