import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { AIAgentModeConfiguration } from "../settings/AIAgentModeConfiguration";
import { FormContainer } from "./OnboardingShared";

export const AgentModeMethodForm = () => {
  const { mode, selectedApiKeyId } = useAppStore(
    (state) => state.settings.agentMode,
  );

  const canContinue = mode === "api" ? Boolean(selectedApiKeyId) : true;

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Set up agent mode" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Agent mode lets you use AI to perform actions on your computer. You can turn this on later in settings." />
      </Typography>

      <AIAgentModeConfiguration hideCloudOption={true} />

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        <Button onClick={() => goBackOnboardingPage()}>
          <FormattedMessage defaultMessage="Back" />
        </Button>
        <Button
          variant="contained"
          onClick={() => goToOnboardingPage("hotkeys")}
          disabled={!canContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
