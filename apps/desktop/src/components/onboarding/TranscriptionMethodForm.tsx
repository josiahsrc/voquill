import { Button, Stack, Typography } from "@mui/material";
import { advancePage } from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AITranscriptionConfiguration } from "../settings/AITranscriptionConfiguration";
import { FormContainer } from "./OnboardingShared";

export const TranscriptionMethodForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.aiTranscription
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Choose your transcription setup
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Decide how Voquill should transcribe your recordings—locally or through
        an API-powered service.
      </Typography>

      <AITranscriptionConfiguration />

      <Stack direction="row" justifyContent="space-between" mt={4}>
        <Button onClick={() => advancePage(-1)}>Back</Button>
        <Button
          variant="contained"
          onClick={() => advancePage()}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </Stack>
    </FormContainer>
  );
};
