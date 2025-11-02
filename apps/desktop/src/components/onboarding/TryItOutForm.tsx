import { Check } from "@mui/icons-material";
import { Button, Stack, TextField, Typography } from "@mui/material";
import {
  goBackOnboardingPage,
  submitOnboarding,
} from "../../actions/onboarding.actions";
import { produceAppState, useAppStore } from "../../store";
import { FormContainer } from "./OnboardingShared";

export const TryItOutForm = () => {
  const input = useAppStore((state) => state.onboarding.tryItOutInput);
  const submitting = useAppStore((state) => state.onboarding.submitting);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    produceAppState((draft) => {
      draft.onboarding.tryItOutInput = value;
    });
  };

  const handleFinish = () => {
    void submitOnboarding();
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Try dictation for yourself
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Press your dictation shortcut and say something. This box doesn’t save
        anything—it’s just for experimenting.
      </Typography>

      <TextField
        value={input}
        onChange={handleChange}
        placeholder="Give it a shot…"
        multiline
        minRows={4}
        slotProps={{
          htmlInput: {
            "data-voquill-ignore": "true",
          },
        }}
      />

      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => goBackOnboardingPage()} disabled={submitting}>
          Back
        </Button>
        <Button
          variant="contained"
          endIcon={<Check />}
          onClick={handleFinish}
          disabled={submitting}
        >
          Finish
        </Button>
      </Stack>
    </FormContainer>
  );
};
