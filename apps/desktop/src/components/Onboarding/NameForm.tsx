import { Check } from "@mui/icons-material";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { advancePage } from "../../actions/onboarding.actions";
import { produceAppState, useAppStore } from "../../store";
import { FormContainer } from "./OnboardingShared";
import { showSnackbar } from "../../actions/app.actions";

export const NameForm = () => {
  const name = useAppStore((state) => state.onboarding.name);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.name = e.target.value;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.name = e.target.value.trim();
    });
  };

  const handleSubmit = () => {
    showSnackbar("Onboarding complete! (not really)");
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        What's your name?
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        This will be used in things like email signatures and stuff.
      </Typography>
      <TextField
        variant="outlined"
        placeholder="Full name"
        value={name}
        onChange={handleChange}
        onBlur={handleBlur}
        autoFocus
        autoComplete="name"
        slotProps={{
          htmlInput: {
            "data-voquill-ignore": "true",
          },
        }}
      />
      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => advancePage(-1)}>Back</Button>
        <Button
          variant="contained"
          disabled={!name}
          endIcon={<Check />}
          onClick={handleSubmit}
        >
          Finish
        </Button>
      </Stack>
    </FormContainer>
  );
};
