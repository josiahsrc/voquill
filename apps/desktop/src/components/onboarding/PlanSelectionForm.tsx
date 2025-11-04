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
      <Stack
        direction="column"
        spacing={2}
        alignItems="center"
        alignSelf="center"
        mb={2}
        sx={{ width: 400 }}
        textAlign="center"
      >
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pick your plan
        </Typography>
        <Typography variant="body1" color="text.secondary" pb={2}>
          The community edition is free forever. Upgrade anytime for more
          features and support.
        </Typography>
      </Stack>

      <PlanList
        onSelect={handleSelectPlan}
        text="Continue"
        ignoreCurrentPlan
        sx={{ width: "100%" }}
      />

      <Stack direction="row" justifyContent="flex-start" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()}>Back</Button>
      </Stack>
    </FormContainer>
  );
};
