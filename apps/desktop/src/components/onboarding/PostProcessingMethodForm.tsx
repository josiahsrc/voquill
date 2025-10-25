import { Button, Stack, Typography } from "@mui/material";
import { advancePage } from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AIPostProcessingConfiguration } from "../settings/AIPostProcessingConfiguration";
import { FormContainer } from "./OnboardingShared";

export const PostProcessingMethodForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.aiPostProcessing
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Pick your post-processing
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Choose if Voquill should enhance transcripts automatically after they
        are transcribed.
      </Typography>

      <AIPostProcessingConfiguration />

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
