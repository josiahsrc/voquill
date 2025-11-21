import { ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  selectOnboardingPlan,
} from "../../actions/onboarding.actions";
import { EffectivePlan } from "../../types/member.types";
import { PlanList } from "../pricing/PlanList";
import { FormContainer } from "./OnboardingShared";

export const PlanSelectionForm = () => {
  const handleSelectPlan = (plan: EffectivePlan) => {
    selectOnboardingPlan(plan);
  };

  return (
    <FormContainer sx={{ maxWidth: 750 }}>
      <Stack
        direction="column"
        alignItems="center"
        alignSelf="center"
        spacing={1}
        sx={{ width: 520, pb: 3 }}
        textAlign="center"
      >
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage defaultMessage="🤩 Try for free. Upgrade anytime for more features and support." />
        </Typography>
      </Stack>

      <PlanList
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
          onClick={() => handleSelectPlan("community")}
          variant="text"
          endIcon={<ArrowForward />}
        >
          <FormattedMessage defaultMessage="Local set up" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
