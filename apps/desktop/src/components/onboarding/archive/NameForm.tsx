/*
import { ArrowForward } from "@mui/icons-material";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../../actions/onboarding.actions";
import { produceAppState, useAppStore } from "../../../store";
import { FormContainer } from "../OnboardingShared";

export const NameForm = () => {
  const intl = useIntl();
  const name = useAppStore((state) => state.onboarding.name);
  const submitting = useAppStore((state) => state.onboarding.submitting);

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

  const handleContinue = () => {
    goToOnboardingPage("plan");
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="What's your name?" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="This will be used in things like email signatures and stuff." />
      </Typography>
      <TextField
        variant="outlined"
        placeholder={intl.formatMessage({ defaultMessage: "Full name" })}
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
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          disabled={!name || submitting}
          endIcon={<ArrowForward />}
          onClick={handleContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
*/
