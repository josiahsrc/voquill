import { ArrowForward } from "@mui/icons-material";
import { Button, Card, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
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
  const didSelectProPlan = useAppStore(
    (state) => state.onboarding.selectedPlan === "pro",
  );

  const goToNextPage = () => {
    goToOnboardingPage("hotkeys");
    setPreferredPostProcessingMode("cloud");
    setPreferredTranscriptionMode("cloud");
  };

  const handleOpenPaymentDialog = async () => {
    const member = await invokeHandler("member/getMyMember", {})
      .then((res) => res.member)
      .catch(() => null);
    if (member?.plan !== "pro") {
      openPaymentDialog(getPriceIdFromKey("pro_monthly"));
    } else {
      goToNextPage();
    }
  };

  useAsyncEffect(async () => {
    if (!currentUserId) {
      return;
    }

    if (didSelectProPlan) {
      handleOpenPaymentDialog();
    } else {
      goToNextPage();
    }
  }, [currentUserId, didSelectProPlan]);

  useAsyncEffect(async () => {
    if (memberPlan === "pro") {
      goToNextPage();
    }
  }, [memberPlan]);

  if (currentUserId) {
    return (
      <FormContainer>
        <Typography variant="h6" gutterBottom>
          <FormattedMessage defaultMessage="You are logged in" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="You haven't completed checkout yet. Click the 'Next' button below to proceed to checkout." />
        </Typography>

        <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
          <Button onClick={() => goBackOnboardingPage()} disabled={loggingIn}>
            <FormattedMessage defaultMessage="Back" />
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenPaymentDialog}
            endIcon={<ArrowForward />}
          >
            <FormattedMessage defaultMessage="Next" />
          </Button>
        </Stack>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Sign in to continue" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        <FormattedMessage defaultMessage="We'll connect your account and launch checkout right after you sign in." />
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
          <FormattedMessage defaultMessage="Back" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
