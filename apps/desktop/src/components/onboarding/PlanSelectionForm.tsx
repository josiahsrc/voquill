import { ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  selectOnboardingPlan,
} from "../../actions/onboarding.actions";
import { trackButtonClick } from "../../utils/analytics.utils";
import { PricingPlan } from "../../utils/price.utils";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { PlanList } from "../pricing/PlanList";
import { FormContainer } from "./OnboardingShared";

export const PlanSelectionForm = () => {
  const [confirmLocalSetupOpen, setConfirmLocalSetupOpen] = useState(false);

  const handleSelectPlan = (plan: PricingPlan) => {
    trackButtonClick(`Onboarding Select Plan - ${plan}`);
    selectOnboardingPlan(plan);
  };

  const handleClickLocalSetup = () => {
    trackButtonClick("Onboarding Local set up");
    setConfirmLocalSetupOpen(true);
  };

  const handleConfirmLocalSetup = () => {
    trackButtonClick("Onboarding Confirm Local Setup");
    handleSelectPlan("community");
  };

  const handleCancelLocalSetup = () => {
    trackButtonClick("Onboarding Cancel Local Setup");
    setConfirmLocalSetupOpen(false);
  };

  return (
    <FormContainer sx={{ maxWidth: 900 }}>
      <ConfirmDialog
        isOpen={confirmLocalSetupOpen}
        onCancel={handleCancelLocalSetup}
        onConfirm={handleConfirmLocalSetup}
        title={<FormattedMessage defaultMessage="⚠️ Advanced Setup Required" />}
        content={
          <FormattedMessage defaultMessage="Local set up is complicated and requires a strong technical background. We recommend the free plan for most users." />
        }
        confirmLabel={<FormattedMessage defaultMessage="Accept" />}
        cancelLabel={<FormattedMessage defaultMessage="Go back" />}
      />
      <Stack
        direction="column"
        alignItems="center"
        alignSelf="center"
        spacing={1}
        sx={{ width: 520, pb: 3 }}
        textAlign="center"
      >
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage defaultMessage="Try for free. Upgrade anytime for more features and support." />
        </Typography>
      </Stack>

      <PlanList
        showEnterprise={true}
        onSelect={handleSelectPlan}
        text="Continue"
        ignoreCurrentPlan
        sx={{ width: "100%" }}
      />

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          onClick={handleClickLocalSetup}
          variant="text"
          endIcon={<ArrowForward />}
          sx={{ color: "text.disabled", fontWeight: 400 }}
        >
          <FormattedMessage defaultMessage="Local set up" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
