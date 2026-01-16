/*
import { Check } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { Nullable } from "@repo/types";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  submitOnboarding,
} from "../../../actions/onboarding.actions";
import { useAppStore, produceAppState } from "../../../store";
import { getEffectivePlan } from "../../../utils/member.utils";
import { MicrophoneSelector } from "../../microphone/MicrophoneSelector";
import { MicrophoneTester } from "../../microphone/MicrophoneTester";
import { FormContainer } from "../OnboardingShared";

export const MicrophoneSelectionForm = () => {
  const submitting = useAppStore((state) => state.onboarding.submitting);
  const preferredMicrophone = useAppStore(
    (state) => state.onboarding.preferredMicrophone,
  );

  const hideBackButton = useAppStore((state) => {
    const myPlan = getEffectivePlan(state);
    return myPlan !== "community" || !state.onboarding.history.length;
  });

  const handleSelectionChange = useCallback((value: Nullable<string>) => {
    produceAppState((draft) => {
      draft.onboarding.preferredMicrophone = value ?? null;
    });
  }, []);

  const handleFinish = () => {
    void submitOnboarding();
  };

  return (
    <FormContainer sx={{ maxWidth: 800 }}>
      <Stack direction="row" spacing={6} alignItems="stretch">
        <Stack flex={1} spacing={2}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            <FormattedMessage defaultMessage="Choose your microphone" />
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            <FormattedMessage defaultMessage="Pick the microphone you want Voquill to use by default. You can change this later from settings." />
          </Typography>

          <MicrophoneSelector
            value={preferredMicrophone ?? null}
            onChange={handleSelectionChange}
            disabled={submitting}
          />
        </Stack>

        <Stack
          spacing={2}
          mt={4}
          mb={2}
          width={260}
          alignItems="stretch"
          textAlign="center"
          sx={{
            bgcolor: "level1",
            borderRadius: 2,
            py: 3,
            px: 3,
          }}
        >
          <Typography variant="headlineMedium">
            <FormattedMessage defaultMessage="Test your mic" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Press record to make sure your microphone is working properly." />
          </Typography>
          <MicrophoneTester
            preferredMicrophone={preferredMicrophone ?? null}
            disabled={submitting}
            waveformHeight={48}
            buttonLayout="row"
            fadeColor="level1"
            justifyButtons="center"
          />
        </Stack>
      </Stack>

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        {hideBackButton ? (
          <div />
        ) : (
          <Button onClick={() => goBackOnboardingPage()} disabled={submitting}>
            <FormattedMessage defaultMessage="Back" />
          </Button>
        )}
        <Button
          variant="contained"
          endIcon={<Check />}
          onClick={handleFinish}
          disabled={submitting}
        >
          <FormattedMessage defaultMessage="Finish" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
*/
