import { Button, Stack, Typography } from "@mui/material";
import { MemberPlan } from "@repo/types";
import {
  goBackOnboardingPage,
  selectOnboardingPlan,
} from "../../actions/onboarding.actions";
import { PlanList } from "../pricing/PlanList";
import { FormContainer } from "./OnboardingShared";

export const PlanSelectionForm = () => {
  const handleSelectPlan = (plan: MemberPlan) => {
    selectOnboardingPlan(plan);
  };

  return (
    <FormContainer sx={{ maxWidth: 750 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Pick your plan
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Start with the Community edition or unlock the Voquill Cloud experience
        with Pro.
      </Typography>

      <PlanList
        onSelect={handleSelectPlan}
        text="Continue"
        ignoreCurrentPlan
        sx={{ width: "100%" }}
      />

      <Stack direction="row" justifyContent="flex-start" mt={4}>
        <Button onClick={() => goBackOnboardingPage()}>Back</Button>
      </Stack>
    </FormContainer>
  );
};
